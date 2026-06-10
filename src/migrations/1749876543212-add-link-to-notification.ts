import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLinkToNotification1749876543212 implements MigrationInterface {
    name = 'AddLinkToNotification1749876543212'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD \`link\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP COLUMN \`link\``);
    }
}
