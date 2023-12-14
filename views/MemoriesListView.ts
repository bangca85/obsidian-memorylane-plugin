import { App, ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { MemoryLaneUtils } from "utils/MemoryLaneUtils";
import MemoryLanePlugin from "main";
import { FolderTimeIndex, NoteRowData } from "utils/MemoryLaneObject";
import { IndexedDBManager } from "data/IndexedDBManager";

export const MEMORIES_VIEW_TYPE = "memories-list-view";
export const MEMORIES_TEXT = "List Memories";

export class MemoriesView extends ItemView {
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

	getViewType() {
		return MEMORIES_VIEW_TYPE;
	}

	getDisplayText() {
		return MEMORIES_TEXT;
	}

	async onOpen() {
		const { containerEl } = this;

		// this.addStyles();
		containerEl.empty();
		this.renderSearch(containerEl);
		this.renderNotes(containerEl);
	}

	renderSearch(containerEl: HTMLElement, searchValue = "") {
		let searchText = "Search notes...";
		if (searchValue) {
			searchText = searchValue;
		}
		containerEl.addClass("memories-view-container");
		// Create a search container with an input field and a search button
		const searchContainer = containerEl.createDiv("timeline-header");
		const searchInput = searchContainer.createEl("input", {
			type: "text",
			attr: { id: "search-box" },
			placeholder: searchText,
			value: searchValue,
		});
		const searchButton = searchContainer.createEl("button", {
			text: "Search",
			attr: { id: "search-btn" },
		});
		searchButton.addEventListener("click", () => {
			const searchTerm = searchInput.value;
			containerEl.empty(); // Clear existing content

			this.renderSearch(containerEl, searchTerm);
			this.renderNotes(containerEl, searchTerm); // Render notes with the search term
		});
		const searchAllButton = searchContainer.createEl("button", {
			text: "All Data",
			attr: { id: "search-btn" },
		});
		searchAllButton.addEventListener("click", () => {
			const searchTerm = "";
			containerEl.empty(); // Clear existing content

			this.renderSearch(containerEl, searchTerm);
			this.renderNotes(containerEl, searchTerm); // Render notes with the search term
		});
		searchInput.addEventListener("keydown", (event) => {
			// Check if the key pressed is 'Enter'
			if (event.key === "Enter") {
				const searchTerm = searchInput.value;
				containerEl.empty(); // Clear existing content
				this.renderSearch(containerEl, searchTerm);
				this.renderNotes(containerEl, searchTerm);
			}
		});
	}

	async renderNotes(containerEl: HTMLElement, searchValue = "") {
		let allNotes : NoteRowData[] =  []; 
		if (searchValue) allNotes = await this.dbManager.getAllData(searchValue,'desc');
		else { 
			//step 1 get last modified date of folder
			const folderTimeObj: FolderTimeIndex | null =
				await this.dbManager.getFolderLastModify(
					this.plugin.settings.folderPath,
					this.plugin.settings.tagName
				); 
			let notesInFolder = null;
			if (folderTimeObj == null || !folderTimeObj) {
				// the first time get data
				notesInFolder = await this.utils.getNotesInFolder(
					this.plugin.settings.folderPath,
					this.app
				);
				//save lastmodify date to database
				const folderTimeIndex: FolderTimeIndex = {
					id: 0,
					folderPath: this.plugin.settings.folderPath,
					hashtag: this.plugin.settings.tagName,
					lastModified: new Date(),
				}; 
				this.dbManager.addRowFolder(folderTimeIndex);
			} else {
				//get data from last modify date
				const lastModify = new Date(folderTimeObj?.lastModified); 
				notesInFolder = await this.utils.getNotesInFolderWithLastModify(
					this.plugin.settings.folderPath,
					lastModify,
					this.app
				);
			}

			for (const fileNote of notesInFolder) {
				const fileContent = await this.app.vault.read(fileNote);
				const filePath =
					this.plugin.settings.folderPath + "/" + fileNote.basename;
				try {
					await this.utils.processFileContent(
						this.dbManager,
						fileNote,
						fileContent,
						this.plugin.settings.tagName,
						filePath
					);
				} catch (error) {
					console.error("Error processing file content:", error);
				}
			}
		//step 3 get data from database
			allNotes = await this.dbManager.getAllData(null, 'desc');
		}
		const contentContainer = containerEl.createDiv(
			"memories-view-container"
		);
		// Create timeline container
		const timelineContainer = contentContainer.createDiv("timeline");
		//if allNotes is empty
		if (allNotes.length == 0) {
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
					eventDate.textContent =  this.utils.formatDate(note.fileCreatedDate, this.plugin.settings.dateFormat);	
				} else {
					eventDate.textContent = this.utils.formatDate(note.rowCreatedDate, this.plugin.settings.dateFormat);	
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
				eventTitle.addEventListener("click", async () => {
					const fileNameWithExtension = note.fileName.endsWith(".md")
						? note.fileName
						: `${note.fileName}.md`;
					const file = this.app.vault.getAbstractFileByPath(
						fileNameWithExtension
					);
					if (file instanceof TFile) {
						const newLeaf = this.app.workspace.getLeaf();
						await newLeaf.openFile(file);
					} else {
						console.error("File not found:", fileNameWithExtension);
					}
				});
			});
		}
	}

	async onClose() {
		// const styles = document.head.querySelectorAll("style");
		// styles.forEach((styleEl) => {
		// 	if (styleEl.innerHTML.includes(CSS_STYLE)) {
		// 		document.head.removeChild(styleEl);
		// 	}
		// });
	}

	async onLoadState(state: any) {
		if (state.markdownContent) {
			this.markdownContent = state.markdownContent;
		}
	} 
}
