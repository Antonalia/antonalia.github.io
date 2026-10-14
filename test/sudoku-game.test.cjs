'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const SudokuGame = require('../source/games/sudoku/sudoku-game.js');
const engine = require('../source/games/sudoku/sudoku-engine.js');

const cells = rows => rows.join('').split('').map(Number);
const puzzle = cells([
  '530070000', '600195000', '098000060',
  '800060003', '400803001', '700020006',
  '060000280', '000419005', '000080079'
]);
const solution = cells([
  '534678912', '672195348', '198342567',
  '859761423', '426853791', '713924856',
  '961537284', '287419635', '345286179'
]);
const bit = digit => 1 << (digit - 1);
const fixture = () => ({ puzzle: puzzle.slice(), solution: solution.slice(), difficulty: 'medium', clueCount: 30 });
const create = () => SudokuGame.create(fixture());
const cloneSave = game => JSON.parse(SudokuGame.serialize(game));

test('given cells and invalid inputs cannot be edited; same digit clears an editable cell', () => {
  const game = create();
  assert.equal(game.enter(0, 1), false);
  assert.equal(game.enter(0, 1, true), false);
  assert.equal(game.erase(0), false);
  for (const index of [-1, 81, 2.5, '2', null]) assert.equal(game.enter(index, 4), false);
  for (const digit of [0, 10, 1.5, '4', null]) assert.equal(game.enter(2, digit), false);
  assert.equal(game.canUndo, false);
  assert.equal(game.enter(2, 4), true);
  assert.equal(game.enter(2, 1, true), false);
  assert.equal(game.enter(2, 4), true);
  assert.equal(game.state.board[2], 0);
  assert.equal(game.erase(2), false);
  assert.equal(game.state.board[0], 5);
});

test('entering a value clears its notes and removes only the same note from peers', () => {
  const game = create();
  // 3 is the same row, 29 the same column, 11 the same box, and 40 is unrelated.
  for (const index of [2, 3, 29, 11, 40]) {
    game.enter(index, 4, true);
    game.enter(index, 2, true);
  }
  assert.equal(game.enter(2, 4), true);
  assert.equal(game.state.notes[2], 0);
  for (const index of [3, 29, 11]) assert.equal(game.state.notes[index], bit(2));
  assert.equal(game.state.notes[40], bit(2) | bit(4));
  assert.equal(game.undo(), true);
  assert.equal(game.state.board[2], 0);
  for (const index of [2, 3, 29, 11, 40]) assert.equal(game.state.notes[index], bit(2) | bit(4));
  assert.equal(game.redo(), true);
  assert.equal(game.state.notes[3], bit(2));
  assert.equal(game.erase(40), true);
  assert.equal(game.state.notes[40], 0);
});

test('notes toggle and branching after undo discards redo while preserving session time', () => {
  const game = create();
  game.enter(2, 4, true);
  game.enter(2, 4, true);
  assert.equal(game.state.notes[2], 0);
  game.enter(2, 4);
  game.state.elapsedMs = 12000;
  assert.equal(game.undo(), true);
  assert.equal(game.state.elapsedMs, 12000);
  assert.equal(game.canRedo, true);
  game.enter(3, 6);
  assert.equal(game.canRedo, false);
  assert.equal(game.redo(), false);
});

test('checking finds answer mistakes even if there is no immediate duplicate', () => {
  const game = create();
  game.enter(2, 1);
  assert.deepEqual(engine.getConflicts(game.state.board), []);
  assert.deepEqual(game.check(), [2]);
  game.enter(3, 6);
  assert.deepEqual(game.check(), [2]);
  game.erase(2);
  assert.deepEqual(game.check(), []);
});

test('hints target selected mistakes or empty cells, then fall back to the first unfinished cell', () => {
  const game = create();
  game.enter(3, 1);
  assert.equal(game.hint(3), 3);
  assert.equal(game.state.board[3], solution[3]);
  assert.equal(game.state.hintsUsed, 1);
  assert.equal(game.hint(0), 2);
  assert.equal(game.state.board[2], solution[2]);
  assert.equal(game.state.hintsUsed, 2);
  game.undo();
  assert.equal(game.state.hintsUsed, 2);
  game.redo();
  assert.equal(game.state.hintsUsed, 2);
  game.undo();
  assert.equal(game.hint(2), 2);
  assert.equal(game.state.hintsUsed, 3);
  assert.equal(game.canRedo, false);
  assert.equal(SudokuGame.restore(SudokuGame.serialize(game)).state.hintsUsed, 3);
});

test('completion blocks edits, allows undo, and redo completes the game again', () => {
  const data = fixture();
  data.puzzle = solution.slice();
  data.puzzle[2] = 0;
  data.clueCount = 80;
  const game = SudokuGame.create(data);
  assert.equal(game.hint(2), 2);
  assert.equal(game.state.completed, true);
  assert.equal(game.enter(2, 4), false);
  assert.equal(game.erase(2), false);
  assert.equal(game.hint(2), null);
  assert.equal(game.undo(), true);
  assert.equal(game.state.completed, false);
  assert.equal(game.state.hintsUsed, 1);
  assert.equal(game.redo(), true);
  assert.equal(game.state.completed, true);
  const restored = SudokuGame.restore(SudokuGame.serialize(game));
  assert.equal(restored.state.completed, true);
  assert.equal(restored.canUndo, false);
  assert.equal(restored.reset(), true);
  assert.equal(restored.state.completed, false);
});

test('pause rejects changes and reset restarts the same puzzle and clears history', () => {
  const game = create();
  game.hint(2);
  game.enter(3, 6, true);
  game.state.elapsedMs = 23456;
  game.state.paused = true;
  const saved = SudokuGame.serialize(game);
  assert.equal(game.enter(3, 6), false);
  assert.equal(game.erase(3), false);
  assert.equal(game.hint(3), null);
  assert.equal(game.undo(), false);
  assert.equal(game.redo(), false);
  assert.equal(SudokuGame.serialize(game), saved);
  assert.equal(game.reset(), true);
  assert.deepEqual(game.state.board, puzzle);
  assert.deepEqual(game.state.notes, new Array(81).fill(0));
  assert.equal(game.state.elapsedMs, 0);
  assert.equal(game.state.hintsUsed, 0);
  assert.equal(game.state.paused, false);
  assert.equal(game.canUndo, false);
  assert.equal(game.canRedo, false);
});

test('history is capped at 200 operations', () => {
  const game = create();
  for (let step = 0; step < 230; step += 1) game.enter(2, 4, true);
  let undos = 0;
  while (game.undo()) undos += 1;
  assert.equal(undos, 200);
  let redos = 0;
  while (game.redo()) redos += 1;
  assert.equal(redos, 200);
});

test('saves restore notes, mistakes, time and pause without persisting history', () => {
  const game = create();
  game.enter(2, 1);
  game.enter(3, 6, true);
  game.state.elapsedMs = 34567.5;
  game.state.paused = true;
  const restored = SudokuGame.restore(SudokuGame.serialize(game));
  assert.deepEqual(restored.state, game.state);
  assert.equal(restored.canUndo, false);
  assert.equal(restored.canRedo, false);
  assert.equal(restored.enter(3, 6), false);
  restored.state.paused = false;
  assert.equal(restored.enter(3, 6), true);
  assert.deepEqual(restored.check(), [2]);
  assert.equal(restored.undo(), true);
  assert.equal(restored.state.notes[3], bit(6));
});

test('restore rejects malformed and tampered saves without throwing', () => {
  const saved = cloneSave(create());
  const mutations = [
    value => { value.version = 2; },
    value => { value.state = null; },
    value => { value.state.puzzle.pop(); },
    value => { value.state.solution[2] = 3; },
    value => { value.state.puzzle = new Array(81).fill(0); value.state.clueCount = 0; },
    value => { value.state.puzzle[2] = 1; value.state.clueCount += 1; },
    value => { value.state.board[0] = 0; },
    value => { value.state.board[2] = '4'; },
    value => { value.state.board[2] = 10; },
    value => { value.state.notes[0] = 1; },
    value => { value.state.notes[2] = 512; },
    value => { value.state.notes[2] = 1.5; },
    value => { value.state.notes.pop(); },
    value => { value.state.elapsedMs = -1; },
    value => { value.state.elapsedMs = '100'; },
    value => { value.state.elapsedMs = Infinity; },
    value => { value.state.paused = 0; },
    value => { value.state.hintsUsed = -1; },
    value => { value.state.hintsUsed = 1.5; },
    value => { value.state.completed = true; },
    value => { value.state.completed = 0; },
    value => { value.state.board = solution.slice(); value.state.completed = true; value.state.paused = true; },
    value => { value.state.clueCount = 31; },
    value => { value.state.difficulty = 'expert'; }
  ];
  for (const mutate of mutations) {
    const changed = JSON.parse(JSON.stringify(saved));
    mutate(changed);
    assert.equal(SudokuGame.restore(JSON.stringify(changed)), null, mutate.toString());
  }
  for (const invalid of [null, {}, '', '{', 'null', '[]', ' '.repeat(20001)]) {
    assert.equal(SudokuGame.restore(invalid), null);
  }
});

test('creation copies input and rejects invalid puzzle data', () => {
  const data = fixture();
  const game = SudokuGame.create(data);
  data.puzzle[0] = 0;
  data.solution[0] = 0;
  assert.equal(game.state.puzzle[0], 5);
  assert.equal(game.state.solution[0], 5);
  assert.equal(game.state.board[0], 5);
  assert.throws(() => SudokuGame.create(data), TypeError);
  assert.throws(() => SudokuGame.create(null), TypeError);
});

test('browser build publishes SudokuGame without CommonJS', () => {
  const context = vm.createContext({ SudokuEngine: engine });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../source/games/sudoku/sudoku-game.js'), 'utf8'), context);
  assert.equal(typeof context.SudokuGame.create, 'function');
  assert.equal(typeof context.SudokuGame.serialize, 'function');
  assert.equal(typeof context.SudokuGame.restore, 'function');
  const game = context.SudokuGame.create(fixture());
  assert.equal(game.enter(2, 4), true);
  assert.equal(context.SudokuGame.restore(context.SudokuGame.serialize(game)).state.board[2], 4);
});
