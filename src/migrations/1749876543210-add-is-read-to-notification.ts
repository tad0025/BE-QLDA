import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsReadToNotification1749876543210 implements MigrationInterface {
    name = 'AddIsReadToNotification1749876543210'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD \`isRead\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD \`readAt\` timestamp NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP COLUMN \`readAt\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP COLUMN \`isRead\``);
    }
}
