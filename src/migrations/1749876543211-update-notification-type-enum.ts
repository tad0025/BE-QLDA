import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateNotificationTypeEnum1749876543211 implements MigrationInterface {
    name = 'UpdateNotificationTypeEnum1749876543211'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` MODIFY \`type\` enum('TICKET_CONFIRM', 'PROMOTION', 'SHOWTIME_REMINDER', 'STOCK_ALERT', 'SYSTEM', 'ACCOUNT') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` MODIFY \`type\` enum('TICKET_CONFIRM', 'PROMOTION', 'SHOWTIME_REMINDER', 'STOCK_ALERT') NOT NULL`);
    }
}
