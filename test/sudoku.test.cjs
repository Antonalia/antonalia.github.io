'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = require('../source/games/sudoku/sudoku-engine.js');

function seededRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function boardFromRows(rows) {
  return rows.join('').split('').map(Number);
}

const knownPuzzle = boardFromRows([
  '530070000', '600195000', '098000060',
  '800060003', '400803001', '700020006',
  '060000280', '000419005', '000080079'
]);

const knownSolution = boardFromRows([
  '534678912', '672195348', '198342567',
  '859761423', '426853791', '713924856',
  '961537284', '287419635', '345286179'
]);

function assertValidSolution(solution) {
  assert.equal(solution.length, 81);
  const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ordered = values => values.slice().sort((a, b) => a - b);
  for (let unit = 0; unit < 9; unit += 1) {
    assert.deepEqual(ordered(solution.slice(unit * 9, unit * 9 + 9)), expected);
    assert.deepEqual(ordered(Array.from({ length: 9 }, (_, row) => solution[row * 9 + unit])), expected);
    const boxRow = Math.floor(unit / 3) * 3;
    const boxColumn = (unit % 3) * 3;
    const box = Array.from({ length: 9 }, (_, cell) =>
      solution[(boxRow + Math.floor(cell / 3)) * 9 + boxColumn + cell % 3]);
    assert.deepEqual(ordered(box), expected);
  }
}

for (const [difficulty, target] of [['easy', 42], ['medium', 34], ['hard', 28]]) {
  test(`${difficulty} generates varied puzzles with a unique valid solution`, () => {
    const signatures = new Set();
    for (const seed of [1, 17, 42, 2026, 65535]) {
      const result = engine.generatePuzzle(difficulty, seededRandom(seed));
      assert.equal(result.difficulty, difficulty);
      assert.equal(result.puzzle.length, 81);
      assertValidSolution(result.solution);
      assert.equal(result.clueCount, result.puzzle.filter(value => value !== 0).length);
      assert.ok(result.clueCount >= target && result.clueCount <= target + 6,
        `seed ${seed}: ${result.clueCount} clues for ${difficulty}`);
      assert.equal(engine.countSolutions(result.puzzle), 1);
      assert.equal(engine.isComplete(result.solution), true);
      assert.equal(engine.isComplete(result.puzzle), false);
      assert.deepEqual(engine.getConflicts(result.puzzle), []);
      result.puzzle.forEach((value, index) => {
        assert.ok(Number.isInteger(value) && value >= 0 && value <= 9);
        if (value !== 0) assert.equal(value, result.solution[index]);
        assert.equal(value === 0, result.puzzle[80 - index] === 0);
      });
      signatures.add(result.puzzle.join(''));
    }
    assert.equal(signatures.size, 5);
  });
}

test('a fixed seed reproduces the same puzzle', () => {
  assert.deepEqual(engine.generatePuzzle('hard', seededRandom(718)),
    engine.generatePuzzle('hard', seededRandom(718)));
});

test('solution counting handles unique, ambiguous, contradictory, and completed boards', () => {
  assert.equal(engine.countSolutions(knownPuzzle), 1);
  assert.equal(engine.countSolutions(knownSolution), 1);
  assert.equal(engine.countSolutions(new Array(81).fill(0)), 2);
  assert.equal(engine.countSolutions(new Array(81).fill(0), 1), 1);
  assert.equal(engine.countSolutions(new Array(81).fill(0), 3), 3);
  const contradictory = knownPuzzle.slice();
  contradictory[2] = 5;
  assert.equal(engine.countSolutions(contradictory), 0);
  // This digit creates no direct duplicate but makes the puzzle unsolvable.
  const impossible = knownPuzzle.slice();
  impossible[2] = 1;
  assert.deepEqual(engine.getConflicts(impossible), []);
  assert.equal(engine.countSolutions(impossible), 0);
});

test('candidates exclude values in the row, column, and box', () => {
  assert.deepEqual(engine.getCandidates(knownPuzzle, 2), [1, 2, 4]);
  assert.deepEqual(engine.getCandidates(knownPuzzle, 40), [5]);
  assert.deepEqual(engine.getCandidates(knownPuzzle, 0), []);
  assert.deepEqual(engine.getCandidates(new Array(81).fill(0), 80), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('conflicts contain every involved cell once, in ascending order', () => {
  const board = new Array(81).fill(0);
  board[0] = 5;
  board[8] = 5; // same row
  board[72] = 5; // same column
  board[10] = 5; // same box
  board[40] = 5; // unrelated
  assert.deepEqual(engine.getConflicts(board), [0, 8, 10, 72]);
  assert.deepEqual(engine.getConflicts(knownSolution), []);
});

test('completion requires all cells filled and every unit valid', () => {
  assert.equal(engine.isComplete(knownSolution), true);
  assert.equal(engine.isComplete(knownPuzzle), false);
  const invalid = knownSolution.slice();
  invalid[0] = invalid[1];
  assert.equal(engine.isComplete(invalid), false);
});

test('inspection and search do not mutate input boards', () => {
  const board = Object.freeze(knownPuzzle.slice());
  const before = board.slice();
  engine.countSolutions(board);
  engine.getCandidates(board, 2);
  engine.getConflicts(board);
  engine.isComplete(board);
  assert.deepEqual(board, before);
  const empty = Object.freeze(new Array(81).fill(0));
  engine.countSolutions(empty, 3);
  assert.deepEqual(empty, new Array(81).fill(0));
});

test('invalid API inputs fail clearly', () => {
  assert.throws(() => engine.countSolutions([]), TypeError);
  assert.throws(() => engine.countSolutions(new Array(81).fill(10)), RangeError);
  assert.throws(() => engine.countSolutions(new Array(81).fill(0.5)), RangeError);
  assert.throws(() => engine.countSolutions(knownPuzzle, 0), RangeError);
  assert.throws(() => engine.getCandidates(knownPuzzle, 81), RangeError);
  assert.throws(() => engine.generatePuzzle('expert'), RangeError);
  assert.throws(() => engine.generatePuzzle('easy', 1), TypeError);
  assert.throws(() => engine.generatePuzzle('easy', () => 1), RangeError);
});

test('the browser build exports the same public API without Node', () => {
  const source = fs.readFileSync(path.join(__dirname, '../source/games/sudoku/sudoku-engine.js'), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source, context);
  assert.deepEqual(Object.keys(context.SudokuEngine).sort(), Object.keys(engine).sort());
  assert.equal(context.SudokuEngine.countSolutions(knownPuzzle), 1);
  assert.equal(context.SudokuEngine.isComplete(knownSolution), true);
});
