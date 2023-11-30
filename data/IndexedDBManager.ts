
import { FileLineIndex, NoteRowData } from "utils/MemoryLaneObject";


export const DATABASSE_VERSION = 1;
export const DATABASE_NAME = 'memorylane-database';
type LineData = {
    id: string;
    content: string;
};

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
                if (!db.objectStoreNames.contains('notes')) {
					db.createObjectStore('notes', { autoIncrement: true });
                }

				const newStoreName = 'file-line-index'; // Thay đổi tên objectStore tùy ý
			if (!db.objectStoreNames.contains(newStoreName)) {
				db.createObjectStore(newStoreName, { autoIncrement: true });
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
            const transaction = this.db.transaction('notes', 'readwrite');
            const store = transaction.objectStore('notes');
            const request = store.add(rowData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getRow(id :number) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('notes', 'readonly');
            const store = transaction.objectStore('notes');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

	async getAllData(rowValue: string, sortDirection: 'asc' | 'desc'): Promise<NoteRowData[]> {
		return new Promise((resolve, reject) => {
			const transaction = this.db.transaction('notes', 'readonly');
			const store = transaction.objectStore('notes');
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
	

    async updateRow(rowData : NoteRowData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('notes', 'readwrite');
            const store = transaction.objectStore('notes');
            const request = store.put(rowData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRow(id : number) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('notes', 'readwrite');
            const store = transaction.objectStore('notes');
            const request = store.delete(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
	
	async getFileLineDataMap(filePath: string): Promise<Map<number, FileLineIndex>> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open('YourDatabaseName', 1);
	
			request.onerror = (event: Event) => {
				console.error('Database error:', (event.target as IDBRequest).error);
				reject((event.target as IDBRequest).error);
			};
	
			request.onsuccess = (event: Event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				const transaction = db.transaction('file-line-index', 'readonly');
				const store = transaction.objectStore('file-line-index');
				const index = store.index('filePath');
				const query = index.getAll(filePath);
	
				query.onsuccess = () => {
					const lineDataMap = new Map<number, FileLineIndex>();
					query.result.forEach((item: FileLineIndex) => {
						lineDataMap.set(item.currentIndex, item);
					});
					resolve(lineDataMap);
				};
	
				query.onerror = (event: Event) => {
					console.error('Query error:', (event.target as IDBRequest).error);
					reject((event.target as IDBRequest).error);
				};
			};
		});
	}
	
	
	async processFileContent(fileContent: string, hashtag: string, filePath: string) {
		const newLines = fileContent.split('\n');
		const lineDataMap = await this.getFileLineDataMap(filePath);
		const newLineDataMap = new Map<string, LineData>();
		newLines.forEach((content, index) => {
        if (content.includes(hashtag)) {
            // let lineData = lineDataMap.get(content);
            // if (!lineData) {
            //     // Tạo dữ liệu dòng mới nếu chưa tồn tại
            //     lineData = {
            //         id: generateUniqueId(),
            //         content: content,
            //         originalIndex: index
            //     };
            // }
            // newLineDataMap.set(content, lineData);
        }
    });
}


	generateUniqueId() : string { 
		return 'unique-id-' + Date.now() + Math.random().toString(16).slice(2);
	}
}
