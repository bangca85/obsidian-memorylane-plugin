import { App, ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { MemoryLaneUtils } from "utils/MemoryLaneUtils";
import MemoryLanePlugin from "main";
import { FolderTimeIndex, NoteRowData } from "utils/MemoryLaneObject";
import { IndexedDBManager } from "data/IndexedDBManager";

export const MEMORIES_VIEW_TYPE = "memories-list-view";
export const MEMORIES_TEXT = "List Memories";

const CSS_STYLE = `

.memories-view-container {
	background-color: #ccc;
	height: 100%;
	overflow-y: auto;
}
.timeline {
	margin: 0 200px;
	padding: 20px 0; 
}

.events-container {
	background-color: white;
	padding: 10px;
	border-radius: 5px;
}

.year-title {
	background-color: #ccc;
	color: #605e5e;
	padding: 20px;
	text-align: left;
	margin: 0;
	font-weight: bold;
	font-size: 1.5em;
}

.event {
	position: relative;
	padding: 10px 0;
	background-color: white;
}

.event:last-child {
	.event-content {
		margin-bottom: none;
	}
}

.event-date {
	position: absolute;
	left: 10px;
	top: 50%;
	transform: translateY(-50%);
	color: #373737;
	width: 100px;
	text-align: center;
	border-radius: 10px;
	font-size: 0.9em;
}


.event-content {
	border-bottom: 1px solid #ddd;
	margin-left: 120px;
	padding-bottom: 15px;
}
.event-title {
	font-weight: normal;
	color: #1c7ad6; 
	cursor: pointer;
	text-align: right;
	display: block;
}

.event-description {
	margin-top: 5px;
	color: #403f3f;
	font-size: 1em;
}

.status {
	position: absolute;
	right: 10px;
	top: 10px;
	background-color: #007bff;
	color: white;
	padding: 2px 8px;
	border-radius: 4px;
	font-size: 0.8em;
}

.timeline-header {
    display: flex;
    justify-content: flex-end;
    padding: 20px 0px;
   margin: 0 200px;
}

.timeline-header #search-box {
    padding: 7px 10px;
    margin: 0px 5px;
    border: 1px solid #ddd;
    border-radius: 5px;
    height: 40px; 
    width: 300px; 
	background-color: #fff;
	box-shadow: #fff;
	text-color: #605e5e;
}

.timeline-header #search-btn {
    padding: 8px 15px;
    border-radius: 5px;
    background-color: #007bff;
    color: white;
    border: none;
    height: 40px;  
    width: 100px;
	margin: 0px 5px;
} 

@media screen and (max-width: 768px) {
	.timeline {
		margin: 0 10px;
		padding: 20px 5px;
	}

	.event-date {
		left: 5px;
		width: 90px;
		font-size: 0.9em;

		.event-content {
			margin-left: 100px;
		}

		.status {
			right: 5px;
			font-size: 0.7em;
		}
	}
	.timeline-header {
        margin: 0 10px;  
        justify-content: center;
        flex-direction: column;
    }

    .timeline-header #search-box {
        width: calc(100% - 20px); 
        margin: 5px 5px;  
    }

    .timeline-header #search-btn {
        width: calc(100% - 20px); 
        margin-bottom: 5px;
    }
`;
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

		this.addStyles();
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
		const styles = document.head.querySelectorAll("style");
		styles.forEach((styleEl) => {
			if (styleEl.innerHTML.includes(CSS_STYLE)) {
				document.head.removeChild(styleEl);
			}
		});
	}

	async onLoadState(state: any) {
		if (state.markdownContent) {
			this.markdownContent = state.markdownContent;
		}
	}

	addStyles() {
		const styleEl = document.createElement("style");
		styleEl.type = "text/css";
		styleEl.innerHTML = CSS_STYLE;
		document.head.appendChild(styleEl);
	}
}
