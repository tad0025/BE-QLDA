import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class AddFixedSeatConfigForRoomType1760000000000 implements MigrationInterface {
  name = 'AddFixedSeatConfigForRoomType1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Tạo bảng cấu hình room type nếu chưa có
    const hasConfigTable = await queryRunner.hasTable('room_type_configs');
    if (!hasConfigTable) {
      await queryRunner.createTable(
        new Table({
          name: 'room_type_configs',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'roomType',
              type: 'enum',
              enum: ['STANDARD', 'VIP', 'IMAX', 'COUPLE'],
              isUnique: true,
            },
            { name: 'rows', type: 'int' },
            { name: 'columns', type: 'int' },
            { name: 'totalSeats', type: 'int' },
            { name: 'isCouple', type: 'boolean', default: false },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updatedAt',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );
    }

    // 2) Seed cấu hình cố định 4 loại phòng
    await queryRunner.query(`
  INSERT INTO room_type_configs (\`roomType\`, \`rows\`, \`columns\`, \`totalSeats\`, \`isCouple\`, \`createdAt\`, \`updatedAt\`)
  VALUES
    ('STANDARD', 8, 10, 80, 0, NOW(), NOW()),
    ('VIP',      4, 10, 40, 0, NOW(), NOW()),
    ('IMAX',    10, 12, 120, 0, NOW(), NOW()),
    ('COUPLE',   2, 10, 20, 1, NOW(), NOW())
  ON DUPLICATE KEY UPDATE
    \`rows\` = VALUES(\`rows\`),
    \`columns\` = VALUES(\`columns\`),
    \`totalSeats\` = VALUES(\`totalSeats\`),
    \`isCouple\` = VALUES(\`isCouple\`),
    \`updatedAt\` = NOW();
`);

    // 3) Thêm cột cố định layout vào rooms nếu chưa có
    const roomsTable = await queryRunner.getTable('rooms');
    if (roomsTable && !roomsTable.findColumnByName('rows')) {
      await queryRunner.addColumn(
        'rooms',
        new TableColumn({
          name: 'rows',
          type: 'int',
          default: 0,
        }),
      );
    }
    if (roomsTable && !roomsTable.findColumnByName('columns')) {
      await queryRunner.addColumn(
        'rooms',
        new TableColumn({
          name: 'columns',
          type: 'int',
          default: 0,
        }),
      );
    }
    if (roomsTable && !roomsTable.findColumnByName('isCouple')) {
      await queryRunner.addColumn(
        'rooms',
        new TableColumn({
          name: 'isCouple',
          type: 'boolean',
          default: false,
        }),
      );
    }

    // 4) Backfill dữ liệu phòng hiện có theo roomType
    await queryRunner.query(`
        UPDATE rooms r
        JOIN room_type_configs rtc ON rtc.roomType = r.roomType
        SET
            r.\`rows\` = rtc.\`rows\`,
            r.\`columns\` = rtc.\`columns\`,
            r.\`totalSeats\` = rtc.\`totalSeats\`,
            r.\`isCouple\` = rtc.\`isCouple\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const roomsTable = await queryRunner.getTable('rooms');

    if (roomsTable?.findColumnByName('isCouple')) {
      await queryRunner.dropColumn('rooms', 'isCouple');
    }
    if (roomsTable?.findColumnByName('columns')) {
      await queryRunner.dropColumn('rooms', 'columns');
    }
    if (roomsTable?.findColumnByName('rows')) {
      await queryRunner.dropColumn('rooms', 'rows');
    }

    const hasConfigTable = await queryRunner.hasTable('room_type_configs');
    if (hasConfigTable) {
      await queryRunner.dropTable('room_type_configs');
    }
  }
}
