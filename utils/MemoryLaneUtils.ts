import { App, TFile } from "obsidian";
import type MemoryLanePlugin from "../main"; // Import your main plugin type
import { NoteRowData, TaggedNoteInfo } from "utils/MemoryLaneObject";
import { IndexedDBManager } from "data/IndexedDBManager";

export class MemoryLaneUtils {
	plugin: MemoryLanePlugin;
	app: App;

	constructor(plugin: MemoryLanePlugin) {
		this.plugin = plugin;
		this.app = plugin.app;
	}

	async getNotesInFolder(folderPath: string, app: App): Promise<TFile[]> {
		const files = app.vault.getFiles();
		let filteredFiles: TFile[] = [];
		// Check if the folderPath is the root
		if (folderPath === "/") {
			// Return files that don't contain '/' in their path, meaning they're in the root
			filteredFiles = files.filter((file) => !file.path.includes("/"));
		} else {
			// For non-root folders, filter normally
			filteredFiles = files.filter((file) =>
				file.path.startsWith(folderPath)
			);
		}

		return filteredFiles;
	}

	async getNotesInFolderWithLastModify(folderPath: string, lastModify: Date, app: App): Promise<TFile[]> {
		const files = app.vault.getFiles();
		let filteredFiles: TFile[] = [];
		
		// Convert lastModify to milliseconds for comparison
		const lastModifyTime = lastModify.getTime();
	
		if (folderPath === "/") {
			filteredFiles = files.filter((file) => {
				// Check if the file is in the root and modified after lastModify
				return !file.path.includes("/") && file.stat.mtime >= lastModifyTime;
			});
		} else {
			filteredFiles = files.filter((file) => {
				// Check if the file starts with folderPath and is modified after lastModify
				return file.path.startsWith(folderPath) && file.stat.mtime >= lastModifyTime;
			});
		}
	
		return filteredFiles;
	}

	async filterNotesByTag(
		notes: TFile[],
		tagName: string,
		app: App
	): Promise<TaggedNoteInfo[]> {
		const taggedNotes: TaggedNoteInfo[] = [];
		const dateRegex = /\b\d{4}-\d{2}-\d{2}\b/; // Regex pattern to match dates in yyyy-mm-dd format

		for (const note of notes) {
			const fileContent = await app.vault.cachedRead(note);
			const fileCreateDate = new Date(note.stat.ctime)
				.toISOString()
				.split("T")[0]; // File creation date in yyyy-mm-dd format

			// const rows = fileContent.split("\n"); 
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const rows = fileContent.match(/^.*$/gm)!;
			for (const row of rows) {
				if (row.includes(tagName)) {
					const rowCreateDateMatch = row.match(dateRegex);
					const rowCreateDate = rowCreateDateMatch
						? rowCreateDateMatch[0]
						: fileCreateDate;

					taggedNotes.push({
						fileName: note.basename,
						fileCreateDate: fileCreateDate,
						contentNote: row,
						rowCreateDate: rowCreateDate,
						yearNote: rowCreateDate.substring(0, 4),
					});
				}
			}
		}
		// taggedNotes.sort((a, b) => a.fileCreateDate.localeCompare(b.fileCreateDate));
		taggedNotes.sort((a, b) =>
			a.rowCreateDate.localeCompare(b.rowCreateDate)
		);

		return taggedNotes;
	}

	async createOrGetFile(
		filePath: string,
		content = ""
	): Promise<TFile | undefined> {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		
		// If file exists, return it
		if (file instanceof TFile) { 
			return file;
		}

		// If file doesn't exist, create it
		try {
			await this.app.vault.create(filePath, content); 
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				return file;
			}
		} catch (error) {
			console.error("Error handling file:", error);
			return undefined;
		}
	}

	async createTimelineMarkdown(
		taggedNotes: TaggedNoteInfo[]
	): Promise<string> {
		let markdownContent = "";
		let currentYear = "";
		taggedNotes.forEach((note) => {
			const noteYear = note.rowCreateDate.substring(0, 4); // Use rowCreateDate for grouping
			if (noteYear !== currentYear) {
				if (currentYear !== "") {
					markdownContent += "\n";
				}
				currentYear = noteYear;
				markdownContent += `> [!info] **${currentYear}**\n\n`; // Year heading as a callout
			}

			// Timeline entry
			markdownContent += `> [!${note.rowCreateDate}]\n`;
			markdownContent += `> ${note.contentNote}\n`;
			markdownContent += `> <span class="right-align">[[${note.fileName}]]</span>\n\n`;
		});

		return markdownContent;
	}

	async writeToMarkdownFile(filePath: string, content: string, app: App) {
		try {
			const file = app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				await app.vault.modify(file, content);
			} else {
				await app.vault.create(filePath, content);
			}
		} catch (error) {
			console.error("Error writing to Markdown file:", error);
		}
	}

	async getMemoriesFromPast(): Promise<TaggedNoteInfo[]> {
		// const memories = await this.getMemoriesFromPast(); // Assuming this is your method to get memories
		const notesInFolder = await this.getNotesInFolder(
			this.plugin.settings.folderPath,
			this.app
		); 
		const taggedNotes = await this.filterNotesByTag(
			notesInFolder,
			this.plugin.settings.tagName,
			this.app
		);

		return taggedNotes;
	}

	async searchNotes(searchText: string): Promise<TaggedNoteInfo[]> {
		const lowerCaseSearchText = searchText.trim().toLowerCase();
		const notes = await this.getMemoriesFromPast();
		const filteredNotes = notes.filter((note) =>
			note.contentNote?.toLowerCase().includes(lowerCaseSearchText)
		);
		return filteredNotes;
	}

	async findFirstNoteByRowContent(notes: NoteRowData[], searchContent: string): Promise<NoteRowData | undefined> {
		return notes.find(note => note.rowContent.includes(searchContent));
	}


	async processFileContent(dbManager: IndexedDBManager, fileNote: TFile, fileContent: string, hashtag: string, filePath: string) {
		const newLines = fileContent.split('\n');
		const lsNoteofFile : NoteRowData[]  = await dbManager.getNotesByFilePath(filePath);
		newLines.forEach((content, index) => {
			// const existingData : NoteRowData | undefined =  this.findFirstNoteByRowContent(lsNoteofFile, content);
			const existingData = lsNoteofFile.find(note => note.rowContent === content);
			const idFileIndex = existingData?.id;
			if (content.includes(hashtag)) {
				if (!existingData || existingData.rowContent !== content) {
					// new row or content changed
					const lineId = idFileIndex|| this.generateUniqueId();
					const modifiedDate = new Date(fileNote.stat.mtime);
					const noteRowData: NoteRowData = {
						id: lineId,
						path: filePath,
						fileName: filePath.split('/').pop() || '',
						fileCreatedDate: new Date(fileNote.stat.ctime),
						fileModifyDate: modifiedDate,
						rowId: '',
						rowContent: content,
						rowCreatedDate: modifiedDate,
						rowYear: modifiedDate.getFullYear().toString(),
						createdDate: new Date(),
						updatedDate: new Date(),
						filePath: filePath,
						dateNo: this.getMMDD(modifiedDate)
					};
					dbManager.updateRow(noteRowData);
				}
			} else if (existingData) {
				// delete row 
				if (idFileIndex) {
					dbManager.deleteRow(idFileIndex);
				} 
			}
		});
}
generateUniqueId() : number { 
	return Number.parseInt(Date.now() + Math.random().toString(16).slice(2));
}

getMMDD(date: Date) : string
{
	const mm = date.getMonth() + 1; // getMonth() is zero-based
	const dd = date.getDate();
	return [mm, dd].join('-'); // padding
}

groupNotesByYear(notes: NoteRowData[]): Record<string, NoteRowData[]> {
    return notes.reduce((acc, note) => { 
        if (!acc[note.rowYear]) {
            acc[note.rowYear] = [];
        } 
        acc[note.rowYear].push(note);
        return acc;
    }, {} as Record<string, NoteRowData[]>);
}

sortGroupedNotes(groupedNotes: Record<string, NoteRowData[]>): Record<string, NoteRowData[]> {
    const sortedGroupedNotes: Record<string, NoteRowData[]> = {};

    // Sort years in descending order
    const sortedYears = Object.keys(groupedNotes).sort().reverse();

    sortedYears.forEach(year => {
        // Sort notes within each year group, for example by createdDate
        const sortedNotes = groupedNotes[year].sort((a, b) => a.createdDate.getTime() - b.createdDate.getTime());
        sortedGroupedNotes[year] = sortedNotes;
    });

    return sortedGroupedNotes;
}

formatDate(date: Date, format: string): string {
    const tokens: Record<string, () => string> = {
        'yyyy': () => date.getFullYear().toString(),
        'MM': () => (date.getMonth() + 1).toString().padStart(2, '0'),
        'dd': () => date.getDate().toString().padStart(2, '0'),
        'HH': () => date.getHours().toString().padStart(2, '0'),
        'mm': () => date.getMinutes().toString().padStart(2, '0'),
        'ss': () => date.getSeconds().toString().padStart(2, '0'),
    };

    return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => tokens[match]());
}
}

