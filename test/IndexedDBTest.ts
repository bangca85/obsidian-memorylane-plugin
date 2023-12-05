import { IndexedDBManager } from 'data/IndexedDBManager';
import { NoteRowData } from 'utils/MemoryLaneObject';


describe('DatabaseManager', () => {
    let dbManager: IndexedDBManager;

    beforeAll(async () => {
        // Tạo và mở IndexedDB (hoặc mock IndexedDB)
        // dbManager = new DatabaseManager(...);
    });

    test('addRow should add a row to the database', async () => {
        const noteRow: NoteRowData = {
			id: 1,
			path: 'path',
			fileName: 'fileName',
			fileCreatedDate: new Date(),
			fileModifyDate: new Date(),
			rowId: 'rowId',
			rowContent: 'rowContent',
			rowCreatedDate: new Date(),
			rowYear: 'rowYear',
			createdDate: new Date(),
			updatedDate: new Date(),
		};
        await dbManager.addRow(noteRow);
        // Thêm assertions để kiểm tra dữ liệu được thêm vào
    });

    // Thêm các test case khác...
});
