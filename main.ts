import { MEMORIES_VIEW_TYPE, MemoriesView } from "views/MemoriesListView";
import { MemoryLaneSettings, ProcessedFileInFolder, TaggedNoteInfo } from "utils/MemoryLaneObject";
import { MemoryLaneSettingsTab } from "views/MemoryLaneSettingsTab";
import { Plugin } from "obsidian";
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
		const data = await this.loadData();
		this.processedFolderFiles = data?.processedFolderFiles || {};
		this.utils = new MemoryLaneUtils(this);
	
		this.addRibbonIcon("brain-circuit", "MemoryLane", async () => {
			this.openMemoriesListView();
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MemoryLaneSettingsTab(this.app, this));
		//register memories list view
		this.registerView(
			MEMORIES_VIEW_TYPE,
			(leaf) => new MemoriesView(leaf, this, this.app)
		);
		//add command to open memories view
		this.addCommand({
			id: "open-memories-list-view",
			name: "Open memories list",
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
			name: "Open memories from this day",
			callback: () => this.openMemoriesDayView(),
		});
			
	}

	onunload() {
	
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

		const leaves = this.app.workspace.getLeavesOfType(MEMORIES_VIEW_TYPE);
		if (leaves.length > 0) {
			// If MemoriesView exists, focus on the first one found
			this.app.workspace.revealLeaf(leaves[0]);
		} else {
			// If no MemoriesView found, create a new one
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.setViewState({
				type: MEMORIES_VIEW_TYPE,
				state: { markdownContent: '' }
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}
	
	async openMemoriesDayView() { 
		const leaves = this.app.workspace.getLeavesOfType(MEMORIES_DAY_TYPE);
	
		if (leaves.length > 0) {
			// If MemoriesDayView exists, focus on the first one found
			this.app.workspace.revealLeaf(leaves[0]);
		} else {
			// If no MemoriesDayView found, create a new one
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.setViewState({
				type: MEMORIES_DAY_TYPE,
				state: { markdownContent: '' }
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}
	
	
}
