import { MEMORIES_VIEW_TYPE, MemoriesView } from "views/MemoriesListView";
import { MemoryLaneSettings, ProcessedFileInFolder, TaggedNoteInfo } from "utils/MemoryLaneObject";
import { MemoryLaneSettingsTab } from "views/MemoryLaneSettingsTab";
import { Editor, MarkdownView, Plugin } from "obsidian";
import { MemoryLaneUtils } from 'utils/MemoryLaneUtils';
import { MEMORIES_DAY_TYPE, MemoriesDay } from "views/MemoriesDay";

// Remember to rename these classes and interfaces!


const DEFAULT_SETTINGS: MemoryLaneSettings = {
	folderPath: "",
	tagName: "",
	dateFormat: ""
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
	
		this.addRibbonIcon("brain-circuit", "MemoryLane", async () => {
			this.openMemoriesListView();
		});
		// console.log("loading plugin");
		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText("Status Bar Text");

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MemoryLaneSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, "click", (evt: MouseEvent) => {
		// 	console.log("click", evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(
		// 	window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		// );

		//register memories list view
		this.registerView(
			MEMORIES_VIEW_TYPE,
			(leaf) => new MemoriesView(leaf, this, this.app)
		);
		//add command to open memories view
		this.addCommand({
			id: "open-memories-list-view",
			name: "Open Memories List",
			callback: () => this.openMemoriesListView(),
		});
		//register memories day view
		this.registerView(
			MEMORIES_DAY_TYPE,
			(leaf) => new MemoriesDay(leaf, this, this.app)
		);
		//add command to open memories view
		this.addCommand({
			id: "open-memories-day-view",
			name: "Open Memories Day",
			callback: () => this.openMemoriesDayView(),
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

	async openMemoriesListView() {
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

	async openMemoriesDayView() {
		// Look for an existing MemoriesView
		console.log("openMemoriesDayView");
		let found = false;
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view.getViewType() === MEMORIES_DAY_TYPE) {
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
				type: MEMORIES_DAY_TYPE,
				state: { markdownContent: '' }
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}
	
	
}
