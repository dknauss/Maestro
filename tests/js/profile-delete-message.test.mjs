import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { profileDeleteMessage } = createRequire(import.meta.url)('../../assets/maestro-logic.js');
const strings = {
	profileDeleteConfirm: 'Delete “%1$s”? It hides %2$d items from %3$d people.',
	profileDeleteItem: 'Delete “%1$s”? It hides %2$d item from %3$d people.',
	profileDeletePerson: 'Delete “%1$s”? It hides %2$d items from %3$d person.',
	profileDeleteBoth: 'Delete “%1$s”? It hides %2$d item from %3$d person.',
	profileDeleteEffect: 'Deleting this group removes its visibility rules. Other rules may still hide these items from its members.',
};
for (const [items, people] of [[0, 0], [0, 2], [3, 0], [3, 2], [1, 0], [0, 1], [1, 1], [1, 2], [2, 1]]) {
	test(`deleting a group with ${items} items and ${people} people describes only applicable effects`, () => {
		const message = profileDeleteMessage('$& group', items, people, strings);
		assert.equal(message, `Delete “$& group”? It hides ${items} ${items === 1 ? 'item' : 'items'} from ${people} ${people === 1 ? 'person' : 'people'}.` +
			(items && people ? ' ' + strings.profileDeleteEffect : ''));
		assert.doesNotMatch(message, /will see/);
	});
}

test('shared action labels use sentence case', async () => {
	const { readFile } = await import('node:fs/promises');
	const php = await readFile(new URL('../../includes/class-assets.php', import.meta.url), 'utf8');
	for (const key of ['modeLabel', 'resetItem', 'resetAll', 'profileAdd', 'widthUseDefault', 'closeDialog', 'closeTour', 'iconDialog', 'profiles', 'previewAs', 'settings']) {
		const match = php.match(new RegExp("'" + key + "'\\s*=>\\s*__\\( '([^']+)'"));
		assert.ok(match, `missing shared label ${key}`);
		assert.equal(match[1].slice(1), match[1].slice(1).toLowerCase(), `${key} must use sentence case`);
	}
});
