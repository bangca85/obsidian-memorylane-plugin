import {
	NoteMetaData,
	PluginDatabase,
	TaggedNoteInfo,
} from "utils/MemoryLaneObject";
import { App, TFile } from "obsidian";
const databasePath =
	".obsidian/plugins/obsidian-memorylanze-plugin/memorylane-database.json";

export class FileDatabaseController {
	private app: App;
	private databasePath: string;
	private database: PluginDatabase;
	private tagName: string;

	constructor(app: App, tagName: string) {
		this.app = app;
		this.databasePath = databasePath;
		this.database = { lastUpdateCheck: 0, notesMetaData: [], path: "/" };
		this.tagName = tagName;
	}

	async initializePlugin(): Promise<TaggedNoteInfo[]> {
		await this.loadDatabase();
		// const unprocessedFiles = await this.getUnprocessedFiles();
		// await this.processFiles(unprocessedFiles);
		// await this.saveDatabase();
		return this.getAllTaggedNotes();
	}

	async loadDatabase(): Promise<void> {
		try {
			let databaseFile = this.app.vault.getAbstractFileByPath(
				this.databasePath
			);
			if (databaseFile instanceof TFile) {
				// Check if the database file exists
				if (!databaseFile) {
					// If the file doesn't exist, create a new file with default database content
					const defaultContent = JSON.stringify({
						lastUpdateCheck: 0,
						notesMetaData: [],
						path: "/",
					});
					await this.app.vault.create(
						this.databasePath,
						defaultContent
					);
					databaseFile = this.app.vault.getAbstractFileByPath(
						this.databasePath
					);
				}
			}

			// If the file exists (or is newly created), read its content
			if (databaseFile instanceof TFile) {
				const databaseContent = await this.app.vault.read(databaseFile);
				this.database = JSON.parse(databaseContent);
			} else {
				throw new Error("Database file not found");
			}
		} catch (error) {
			console.error("Error loading database:", error);
			// Set default database structure in case of an error
			this.database = {
				lastUpdateCheck: 0,
				notesMetaData: [],
				path: "/",
			};
		}
	}

	async saveDatabase(): Promise<void> {
		try {
			// Get the TFile object from the path, or create it if it doesn't exist
			const databaseFile = this.app.vault.getAbstractFileByPath(
				this.databasePath
			);
			if (databaseFile instanceof TFile) {
				if (!databaseFile) {
					// Create the file if it doesn't exist
					await this.app.vault.create(
						this.databasePath,
						JSON.stringify(this.database)
					);
				} else {
					if (databaseFile instanceof TFile) {
						// Modify the existing file
						await this.app.vault.modify(
							databaseFile,
							JSON.stringify(this.database)
						);
					} else {
						throw new Error("Database path is not a file");
					}
				}
			}
		} catch (error) {
			// Handle errors, such as file creation/modification issues
			console.error("Error saving database:", error);
		}
	}

	updateDatebase(database: PluginDatabase): void {
		this.database = database;
	}

	private async getUnprocessedFiles(): Promise<TFile[]> {
		const allFiles = this.app.vault.getFiles();
		return allFiles.filter(
			(file) =>
				file.stat.mtime > this.database.lastUpdateCheck ||
				!this.database.notesMetaData.some(
					(note) => note.fileName === file.path
				)
		);
	}

	updateLastUpdateCheck(): void {
		this.database.lastUpdateCheck = Date.now();
	}

	private getAllTaggedNotes(): TaggedNoteInfo[] {
		return this.database.notesMetaData.flatMap((note) => note.taggedInfo);
	}

	async processFiles(files: TFile[]): Promise<void> {
		for (const file of files) {
			// Read file and process content
			const taggedInfos = this.extractTaggedInfoFromFile(
				file,
				this.tagName
			);

			// Update or add note metadata
			const existingNoteIndex = this.database.notesMetaData.findIndex(
				(note) => note.fileName === file.name
			);
			if (existingNoteIndex !== -1) {
				this.database.notesMetaData[existingNoteIndex].taggedInfo =
					await taggedInfos;
			} else {
				this.database.notesMetaData.push({
					fileName: file.path,
					lastModified: file.stat.mtime,
					taggedInfo: await taggedInfos,
				});
			}
		}
	}

	async clearDatabaseForNewSettings(
		newPath: string,
		newTagName: string
	): Promise<void> {
		this.database = {
			lastUpdateCheck: 0,
			notesMetaData: [],
			path: newPath,
		};
		this.tagName = newTagName;
		await this.saveDatabase();
	}

	private async extractTaggedInfoFromFile(
		file: TFile,
		tagName: string
	): Promise<TaggedNoteInfo[]> {
		const dateRegex = /\b\d{4}-\d{2}-\d{2}\b/; // Regex pattern to match dates in yyyy-mm-dd format
		const taggedNotes: TaggedNoteInfo[] = [];
		const fileContent = await this.app.vault.read(file);
		const fileCreateDate = new Date(file.stat.ctime)
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
					fileName: file.basename,
					fileCreateDate: fileCreateDate,
					contentNote: row,
					rowCreateDate: rowCreateDate,
					yearNote: rowCreateDate.substring(0, 4),
				});
			}
		}
		return taggedNotes;
	}

	updateNoteMetaData(updatedNote: NoteMetaData): void {
		const index = this.database.notesMetaData.findIndex(
			(note) => note.fileName === updatedNote.fileName
		);
		if (index !== -1) {
			this.database.notesMetaData[index] = updatedNote;
		} else {
			this.database.notesMetaData.push(updatedNote);
		}
	}
}
