import { App, TFile } from "obsidian";
import type MemoryLanePlugin from "../main"; // Import your main plugin type
import { TaggedNoteInfo } from "utils/MemoryLaneObject";

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

		// for(const item of filteredFiles) {
		// 	const lastModified = item.stat.mtime;
		// 	const processedInfo = this.processedFolderFiles[item.path];
		// 	// process if processedInfo is undefined or lastModified is different
		// 	if(!processedInfo || processedInfo.lastModified !== lastModified) {
		// 		this.processedFolderFiles[item.path] = {
		// 			path: item.path,
		// 			fileName: item.basename,
		// 			lastModified: lastModified
		// 		}
		// 		await this.saveProcessedFolderFiles();
		// 	}
		// }
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
			const fileContent = await app.vault.read(note);
			const fileCreateDate = new Date(note.stat.ctime)
				.toISOString()
				.split("T")[0]; // File creation date in yyyy-mm-dd format

			const rows = fileContent.split("\n");
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
	): Promise<TFile | null> {
		const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;

		// If file exists, return it
		if (file) {
			console.log("File exists:", filePath);
			return file;
		}

		// If file doesn't exist, create it
		try {
			await this.app.vault.create(filePath, content);
			console.log("File created:", filePath);
			return this.app.vault.getAbstractFileByPath(filePath) as TFile;
		} catch (error) {
			console.error("Error handling file:", error);
			return null;
		}
	}

	async createTimelineMarkdown(
		taggedNotes: TaggedNoteInfo[]
	): Promise<string> {
		let markdownContent = "";
		let currentYear = "";
		console.log("taggedNotes");
		console.log(taggedNotes);
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
			const file = app.vault.getAbstractFileByPath(filePath) as TFile;
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
		console.log(notesInFolder);
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
}
