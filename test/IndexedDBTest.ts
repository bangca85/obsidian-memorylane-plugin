import { IndexedDBManager } from '@/database/IndexedDBManager';
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
			title: 'Test note',
			content: 'Test note content',
			createdDate: new Date(),
			modifiedDate: new Date(),
			tags: ['tag1', 'tag2'],
		 };
        await dbManager.addRow(noteRow);
        // Thêm assertions để kiểm tra dữ liệu được thêm vào
    });

    // Thêm các test case khác...
});
