import { PluginSettingTab, Setting, App, TFolder } from 'obsidian';
import MemoryLanePlugin from './main';

export class MemoryLaneSettingsTab extends PluginSettingTab {
    plugin: MemoryLanePlugin;

    constructor(app: App, plugin: MemoryLanePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let {containerEl} = this;

        containerEl.empty();
        // Get all folders
		const folders = this.getFolders(this.app);
        // Folder Path Setting
        new Setting(containerEl)
            .setName('Folder Path')
            .setDesc('Path of the folder to monitor')
			.addDropdown(dropdown => {
				// Populate dropdown with folders
				folders.forEach(folder => {
					dropdown.addOption(folder, folder);
				});
				dropdown.setValue(this.plugin.settings.folderPath);
				dropdown.onChange(async (value: string) => {
					this.plugin.settings.folderPath = value;
					await this.plugin.saveSettings();
				});
			});
        // Tag Name Setting
        new Setting(containerEl)
            .setName('Tag Name')
            .setDesc('Name of the tag to filter notes')
            .addText(text => text
                .setPlaceholder('Enter tag name')
                .setValue(this.plugin.settings.tagName)
                .onChange(async (value) => {
                    this.plugin.settings.tagName = value;
                    await this.plugin.saveSettings();
                }));

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('The display date format, default is yyyy-mm-dd')
			.addText(text => text
				.setPlaceholder('Enter date format')
				.setValue(this.plugin.settings.dateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateFormat = value;
					await this.plugin.saveSettings();
				}));
    }

	getFolders(app: App): string[] {
		return app.vault.getAllLoadedFiles()
			.filter(file => file instanceof TFolder)
			.map(folder => folder.path);
	}
	
}
