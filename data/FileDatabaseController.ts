import {
	NoteMetaData,
	PluginDatabase,
	TaggedNoteInfo,
} from "utils/MemoryLaneObject";
import { App, Plugin, TFile } from "obsidian";

export class FileDatabaseController {
	private app: App;
	private plugin: Plugin;
	private databasePath: string;
	private database: PluginDatabase;
	private tagName: string;

	constructor(app: App,plugin: Plugin, tagName: string) {
		this.app = app;
		this.databasePath = `${plugin.manifest.dir}/memorylane-database.json`;
		this.database = { lastUpdateCheck: 0, notesMetaData: [], path: "/" };
		this.tagName = tagName;
		this.plugin = plugin;
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
            const adapter = this.app.vault.adapter;
            if (await adapter.exists(this.databasePath)) {
                const databaseContent = await adapter.read(this.databasePath);
                this.database = JSON.parse(databaseContent);
            } else {
                // If the file doesn't exist, create a new file with default database content
                const defaultContent = JSON.stringify({
                    lastUpdateCheck: 0,
                    notesMetaData: [],
                    path: "/",
                });
                await adapter.write(this.databasePath, defaultContent);
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
            const adapter = this.app.vault.adapter;
            if (await adapter.exists(this.databasePath)) {
                await adapter.write(this.databasePath, JSON.stringify(this.database));
            } else {
                // Create the file if it doesn't exist
                await adapter.write(this.databasePath, JSON.stringify(this.database));
            }
        } catch (error) {
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
