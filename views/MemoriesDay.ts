import { IndexedDBManager } from "data/IndexedDBManager";
import MemoryLanePlugin from "main";
import { App, ItemView, TFile, WorkspaceLeaf,  } from "obsidian";
import { NoteRowData } from "utils/MemoryLaneObject";
import { MemoryLaneUtils } from "utils/MemoryLaneUtils";


export const MEMORIES_DAY_TYPE = "memories-day-view";
export const MEMORIES_DAY_TEXT = "Memories Day";

export class MemoriesDay extends ItemView
{
	private dbManager: IndexedDBManager;
	markdownContent: string;
	utils: MemoryLaneUtils;
	plugin: MemoryLanePlugin;
	app: App;

	constructor(leaf: WorkspaceLeaf, plugin: MemoryLanePlugin, app: App) {
		super(leaf);
		this.plugin = plugin;
		this.utils = new MemoryLaneUtils(plugin);
		this.app = app;
		this.dbManager = new IndexedDBManager();
		this.initialize();
	}

	async initialize() {
		await this.dbManager.openDatabase();
	}


	getViewType(): string {
		return MEMORIES_DAY_TYPE;
	}
	getDisplayText(): string {
		return MEMORIES_DAY_TEXT;
	}
	
	async onOpen() {
		const { containerEl } = this;

		// this.addStyles();
		containerEl.empty();
		this.renderNotes(containerEl);
	}

	async renderNotes(containerEl: HTMLElement) {
		const dateNo = this.utils.getMMDD(new Date());
		const allNotes : NoteRowData[] | null = await this.dbManager.getMemories(dateNo);
		
		const contentContainer = containerEl.createDiv(
			"memories-view-container"
		);
		// Create timeline container
		const timelineContainer = contentContainer.createDiv("timeline");
		//if allNotes is empty
		if (allNotes === null || allNotes.length === 0) {
			timelineContainer.createEl("div", {
				cls: "event",
				text: "No notes found",
			});
			return;
		}
		// Group notes by year
		const groupedNotes = this.utils.groupNotesByYear(allNotes);
		//sort by year
		const sortedYears = this.utils.sortGroupedNotes(groupedNotes);

		for (const year in sortedYears) {
			// Create year title
			const yearTitle = timelineContainer.createEl("div", {
				cls: "year-title",
			});
			yearTitle.textContent = year;

			// Create a container for the notes of the year
			const eventsContainer =
				timelineContainer.createDiv("events-container");
			const notesInYear : NoteRowData[] = sortedYears[year];
			notesInYear.forEach(currentNote => {
				const note: NoteRowData = currentNote;
				// Create event item
				const eventDiv = eventsContainer.createDiv("event");

				// Event date

				const eventDate = eventDiv.createDiv("event-date");
				if (note.fileCreatedDate === note.rowCreatedDate) {
					eventDate.textContent = note.fileCreatedDate.toDateString(); // Use fileCreateDate for event date
				} else {
					eventDate.textContent = note.rowCreatedDate.toDateString(); // Use rowCreateDate for event date
				}
				// Event content
				const eventContent = eventDiv.createDiv("event-content");

				eventContent.createEl("div", {
					cls: "event-description",
					text: note.rowContent,
				}); // Use tagRow for event description
				const eventTitle = eventContent.createEl("div", {
					cls: "event-title",
				});
				eventTitle.textContent = note.fileName; // Use textContent or innerText
				eventTitle.addEventListener("click", async (evt) => {
					const fileNameWithExtension = note.fileName.endsWith(".md")
						? note.fileName
						: `${note.fileName}.md`;
					const file = this.app.vault.getAbstractFileByPath(
						fileNameWithExtension
					);
					if (file instanceof TFile) {
						// Create a new leaf (pane) in the workspace
						const openInNewLeaf = evt.ctrlKey || evt.metaKey;
						// Find a suitable leaf for opening the file
						const leaf = this.app.workspace.getLeaf(openInNewLeaf);
						await leaf.openFile(file);
						
					} else {
						console.error("File not found:", fileNameWithExtension);
					}
				});
			});
		}
	}

	async onClose() {
	}
}
