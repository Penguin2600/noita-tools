import Dexie, { Table } from 'dexie';
import deepEqual from 'fast-deep-equal/es6/react';

async function populate() {
	await db.configItems.bulkAdd([
		{
			key: 'theme',
			val: 'light'
		},
		{
			key: 'useCores',
			val: 1
		},
		{
			key: 'last-tab',
			val: 'SeedInfo'
		},
		{
			key: 'alchemy-show-id',
			val: false
		},
		{
			key: 'show-need-feedback-alert',
			val: 0
		}
	]);
}

interface ConfigItem {
	id?: number;
	key: string;
	val: any;
}

interface SeedInfoItem {
	id?: number;
	seed: string;
	config: any;
	updatedAt: Date;
}

export class NoitaDB extends Dexie {
	configItems!: Table<ConfigItem, number>;
	seedInfo!: Table<SeedInfoItem, number>;

	constructor() {
		super('NoitaDB');

		// Maybe extract this into its own files so that any future upgrades don't
		// increase the size of this file exponentially?

		// https://dexie.org/docs/Tutorial/Design#database-versioning
		this.version(3).stores({
			configItems: '++id, &key',
			seedInfo: '++id, &seed'
		});

		this.version(4)
			.stores({
				configItems: '++id, &key',
				seedInfo: '++id, &seed, updatedAt'
			})
			.upgrade(t => {
				((t as any).seedInfo as NoitaDB['seedInfo'])
					.toCollection()
					.modify(s => {
						if (s.updatedAt) {
							return;
						}
						s.updatedAt = new Date();
					});
			});
	}

	async setConfig(key: string, val: any) {
		const exists = await this.configItems.get({ key });
		if (!exists) {
			await this.configItems.add({
				key,
				val
			});
			return;
		}
		return this.configItems
			.where('key')
			.equals(key)
			.modify({ val });
	}

	async setSeedInfo(seed: string, config: any) {
		return this.transaction('rw', this.seedInfo, async t => {
			const exists = await this.seedInfo.get({ seed });
			if (!exists) {
				await this.seedInfo.add({
					seed,
					config,
					updatedAt: new Date()
				});
				return;
			}

			if (deepEqual(config, exists.config)) {
				return;
			}

			return this.seedInfo
				.where('seed')
				.equals(seed)
				.modify({ config, updatedAt: new Date() });
		});
	}
}

export const db = new NoitaDB();

db.on('populate', populate);

export async function resetDatabase() {
	await Promise.all(db.tables.map(table => table.clear()));
	await populate();
}

export async function clearSeeds() {
	await db.seedInfo.clear();
}