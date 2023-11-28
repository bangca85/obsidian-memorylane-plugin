export type MemoryLaneSettings = {
	folderPath: string;
	tagName: string;
	dateFormat: string;
};

export type TaggedNoteInfo = {
	fileName: string;
	fileCreateDate: string;
	contentNode: string;
	rowCreateDate: string;
};

export type ProcessedFileInFolder = {
	path: string;
	fileName: string;
	lastModified: number;
};

export type NotesByYear = { [year: string]: TaggedNoteInfo[] };
