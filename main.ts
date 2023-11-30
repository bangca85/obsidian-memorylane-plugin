import { MEMORIES_VIEW_TYPE, MemoriesView } from "views/MemoriesView";
import { MemoryLaneSettings, ProcessedFileInFolder, TaggedNoteInfo } from "utils/MemoryLaneObject";
import { MemoryLaneSettingsTab } from "views/MemoryLaneSettingsTab";
import { Editor, MarkdownView, Plugin } from "obsidian";
import { MemoryLaneUtils } from 'utils/MemoryLaneUtils';

// Remember to rename these classes and interfaces!


const DEFAULT_SETTINGS: MemoryLaneSettings = {
	folderPath: "",
	tagName: "",
};

export default class MemoryLanePlugin extends Plugin {
	settings: MemoryLaneSettings;
	taggedNotes: TaggedNoteInfo[] = [];
	processedFolderFiles: Record<string, ProcessedFileInFolder> = {};
	utils: MemoryLaneUtils;

	async onload() { 
		await this.loadSettings();
		this.processedFolderFiles = await this.loadData() || {};
		this.utils = new MemoryLaneUtils(this);
		// Get and filter notes when the icon is clicked

		// this.addRibbonIcon("dice", "Timeline", async () => {
		// 	// await this.loadSettings();
		// 	console.log("demo ribbon icon");
		// 	const filePath = "NewFile.md"; // Replace with your desired folder path
		// 	console.log("this.settings", this.settings);
		// 	const file = await this.utils.createOrGetFile(
		// 		filePath,
		// 		"Initial content of the file"
		// 	);
		// 	if (file) {
		// 		const notesInFolder = await this.utils.getNotesInFolder(
		// 			this.settings.folderPath,
		// 			this.app
		// 		);
		// 		console.log(notesInFolder);
		// 		this.taggedNotes = await this.utils.filterNotesByTag(
		// 			notesInFolder,
		// 			this.settings.tagName,
		// 			this.app
		// 		);
		// 		console.log(this.taggedNotes);
		// 		const markdownContent = this.utils.createTimelineMarkdown(
		// 			this.taggedNotes
		// 		);
		// 		await this.utils.writeToMarkdownFile(
		// 			filePath,
		// 			await markdownContent,
		// 			this.app
		// 		);
		// 		this.app.workspace.openLinkText(file.path, "/", true); // Open the file
		// 		// await switchToFileReadingMode(filePath); // Switch to preview mode
		// 	}

		// 	// new TimelineModal(this.app,taggedNotes).open();
		// });
		this.addRibbonIcon("dice", "MemoryLane", async () => {
			this.openMemoriesView();
		});
		console.log("loading plugin");
		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MemoryLaneSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);

		//register memories view
		this.registerView(
			MEMORIES_VIEW_TYPE,
			(leaf) => new MemoriesView(leaf, this, this.app)
		);
		//add command to open memories view
		this.addCommand({
			id: "open-memories-view",
			name: "Open Memories View",
			callback: () => this.openMemoriesView(),
		});
	}

	onunload() {
		console.log("unloading plugin");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}


	async saveProcessedFolderFiles() {
        await this.saveData(this.processedFolderFiles);
    }

	async saveSettings() {
		await this.saveData(this.settings);
	} 

	async openMemoriesView() {
		// Look for an existing MemoriesView
		let found = false;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view.getViewType() === MEMORIES_VIEW_TYPE) {
				// If MemoriesView is found, focus on it and set found to true
				this.app.workspace.revealLeaf(leaf);
				found = true;
				return false; // Stop iterating
			}
		});
	
		// If MemoriesView is not found, create a new one
		if (!found) {
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.setViewState({
				type: MEMORIES_VIEW_TYPE,
				state: { markdownContent: '' }
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}
	
	
}
