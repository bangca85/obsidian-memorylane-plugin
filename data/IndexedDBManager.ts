
import { FileLineIndex, FolderTimeIndex, NoteRowData } from "utils/MemoryLaneObject";


export const DATABASSE_VERSION = 1;
export const DATABASE_NAME = 'memorylane-database';
export const TABLE_FOLDER_TIME_INDEX = 'folder-time-index';
export const TABLE_NOTES = 'notes';
export class IndexedDBManager {
    private db: IDBDatabase;
	private dbName: string;
	private dbVersion: number;

    constructor() {
        this.dbName = DATABASE_NAME;
		this.dbVersion = DATABASSE_VERSION;
    }

	async openDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
		
            const request = indexedDB.open(this.dbName, this.dbVersion); 
            request.onupgradeneeded = (event) => {
                const db = request.result;
                if (!db.objectStoreNames.contains(TABLE_NOTES)) {
					const objectStore = db.createObjectStore(TABLE_NOTES, { autoIncrement: true });
					objectStore.createIndex('filePath', 'filePath', { unique: false });
					objectStore.createIndex('dateNo', 'dateNo', { unique: false });
                }
 
			if (!db.objectStoreNames.contains(TABLE_FOLDER_TIME_INDEX)) {
				const objectStore = db.createObjectStore(TABLE_FOLDER_TIME_INDEX, { autoIncrement: true });
				objectStore.createIndex('folderPath', 'folderPath', { unique: false });
				objectStore.createIndex('hashtag', 'hashtag', { unique: false });
			}
            };
			
            request.onsuccess = (event) => {
                this.db = request.result;
                resolve();
            };

            request.onerror = (event) => {
                reject(request.error);
            };
        });
    }

    async addRow(rowData: NoteRowData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(TABLE_NOTES, 'readwrite');
            const store = transaction.objectStore(TABLE_NOTES);
            const request = store.add(rowData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRow(id :number) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(TABLE_NOTES, 'readonly');
            const store = transaction.objectStore(TABLE_NOTES);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

	async getAllData(rowValue: string | null, sortDirection: 'asc' | 'desc'): Promise<NoteRowData[]> {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction(TABLE_NOTES, 'readonly');
			const store = transaction.objectStore(TABLE_NOTES);
			const request = store.openCursor();
			const data: NoteRowData[] = [];
	
			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					if (!rowValue || cursor.value.rowContent.includes(rowValue)) {
						data.push(cursor.value);
					}
					cursor.continue();
				} else {
					const sortedData = data.sort((a, b) => {
						const dateA = new Date(a.rowCreatedDate).getTime();
						const dateB = new Date(b.rowCreatedDate).getTime();
						return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
					});
					resolve(sortedData);
				}
			};
	
			request.onerror = () => {
				reject(request.error);
			};
		});
	}
	
	async  getNotesByFilePath(filePath: string): Promise<NoteRowData[]> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);
			request.onsuccess = (event: Event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				const transaction = db.transaction(TABLE_NOTES, 'readonly');
				const store = transaction.objectStore(TABLE_NOTES);
				const index = store.index('filePath');
				const query = index.getAll(filePath);
	
				query.onsuccess = () => {
					resolve(query.result as NoteRowData[]);
				};
	
				query.onerror = (event: Event) => {
					console.error('Query error:', (event.target as IDBRequest).error);
					reject((event.target as IDBRequest).error);
				};
			};
			request.onerror = () => {
				reject(request.error);
			};
		});
	}

    async updateRow(rowData : NoteRowData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(TABLE_NOTES, 'readwrite');
            const store = transaction.objectStore(TABLE_NOTES);
            const request = store.put(rowData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRow(id : number) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(TABLE_NOTES, 'readwrite');
            const store = transaction.objectStore(TABLE_NOTES);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

	async getFolderLastModify(folderPath: string, hashtag: string): Promise<FolderTimeIndex | null> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);
	
			request.onerror = (event: Event) => {
				console.error('Database error:', (event.target as IDBRequest).error);
				reject((event.target as IDBRequest).error);
			};
	
			request.onsuccess = (event: Event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				const transaction = db.transaction(TABLE_FOLDER_TIME_INDEX, 'readonly');
				const store = transaction.objectStore(TABLE_FOLDER_TIME_INDEX);
	
				try {
					const index = store.index('folderPath');
					const query = index.getAll(folderPath);
	
					query.onsuccess = () => {
						// Filter the results by the hashtag
						const filteredResults = query.result.filter(item => item.hashtag === hashtag);
						const result = filteredResults.length > 0 ? filteredResults[0] as FolderTimeIndex : null;
						resolve(result);
					};
	
					query.onerror = (event: Event) => {
						console.error('Query error:', (event.target as IDBRequest).error);
						reject((event.target as IDBRequest).error);
					};
				} catch (error) {
					console.error('Error accessing index:', error);
					reject(error);
				}
			};
		});
	}
	
	async getFileLineDataMap(filePath: string): Promise<Map<string, FileLineIndex>> {
		return new Promise((resolve, reject) => { 
			const request = indexedDB.open(this.dbName, this.dbVersion);
			request.onerror = (event: Event) => {
				console.error('Database error:', (event.target as IDBRequest).error);
				reject((event.target as IDBRequest).error);
			};
	
			request.onsuccess = (event: Event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				console.log('this.dbName', this.dbName);
				const transaction = db.transaction('file-line-index', 'readonly');
				const store = transaction.objectStore('file-line-index');
				try {
					const index = store.index('filePath');
					const query = index.getAll(filePath);
	
					query.onsuccess = () => {
						const lineDataMap = new Map<string, FileLineIndex>();
						query.result.forEach((item: FileLineIndex) => {
							lineDataMap.set(item.content, item);
						});
						resolve(lineDataMap);
					};
	
					query.onerror = (event: Event) => {
						console.error('Query error:', (event.target as IDBRequest).error);
						reject((event.target as IDBRequest).error);
					};
				} catch (error) {
					console.error('Error accessing index:', error);
					reject(error);
				}
			};
		});
	}
	
	
	async addRowFolder(rowData: FolderTimeIndex) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(TABLE_FOLDER_TIME_INDEX, 'readwrite');
            const store = transaction.objectStore(TABLE_FOLDER_TIME_INDEX);
            const request = store.add(rowData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

	async updateRowFolderIndex(rowData : FolderTimeIndex) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(TABLE_FOLDER_TIME_INDEX, 'readwrite');
            const store = transaction.objectStore(TABLE_FOLDER_TIME_INDEX);
            const request = store.put(rowData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRowFolderIndex(id : number) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(TABLE_FOLDER_TIME_INDEX, 'readwrite');
            const store = transaction.objectStore(TABLE_FOLDER_TIME_INDEX);
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    } 

	async getMemories(dateNo: string): Promise<NoteRowData[] | null> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);
	
			request.onerror = (event: Event) => {
				console.error('Database error:', (event.target as IDBRequest).error);
				reject((event.target as IDBRequest).error);
			};
	
			request.onsuccess = (event: Event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				const transaction = db.transaction(TABLE_NOTES, 'readonly');
				const store = transaction.objectStore(TABLE_NOTES);
	
				try {
					const index = store.index('dateNo');
					const query = index.getAll(dateNo);
	
					query.onsuccess = () => {
						const notes = query.result as NoteRowData[];
						// Sort the notes array by createdDate in descending order
						notes.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime());
	
						resolve(notes);
					};
	
					query.onerror = (event: Event) => {
						console.error('Query error:', (event.target as IDBRequest).error);
						reject((event.target as IDBRequest).error);
					};
				} catch (error) {
					console.error('Error accessing index:', error);
					reject(error);
				}
			};
		});
	}
}
