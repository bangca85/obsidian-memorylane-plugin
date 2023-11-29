export type MemoryLaneSettings = {
	folderPath: string;
	tagName: string;
	dateFormat: string;
};
export type ProcessedFileInFolder = {
	path: string;
	fileName: string;
	lastModified: number;
};

export type NotesByYear = { [year: string]: TaggedNoteInfo[] };


export type TaggedNoteInfo = {
	fileName: string;
	fileCreateDate: string;
	contentNote: string;
	rowCreateDate: string;
	yearNote: string;
};

export type NoteMetaData = {
    fileName: string;
    lastModified: number;
    taggedInfo: TaggedNoteInfo[];
};

export type PluginDatabase = {
    lastUpdateCheck: number;
    notesMetaData: NoteMetaData[];
	path: string;
};
