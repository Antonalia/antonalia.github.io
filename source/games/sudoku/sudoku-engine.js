(function (root, factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SudokuEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SIZE = 81;
  var ALL_DIGITS = 511;
  var CLUE_TARGETS = { easy: 42, medium: 34, hard: 28 };
  var BIT_COUNTS = new Uint8Array(512);
  var BIT_DIGITS = new Uint8Array(512);
  var ROWS = new Uint8Array(SIZE);
  var COLUMNS = new Uint8Array(SIZE);
  var BOXES = new Uint8Array(SIZE);

  for (var mask = 1; mask <= ALL_DIGITS; mask += 1) {
    BIT_COUNTS[mask] = BIT_COUNTS[mask >> 1] + (mask & 1);
  }
  for (var digit = 1; digit <= 9; digit += 1) {
    BIT_DIGITS[1 << (digit - 1)] = digit;
  }
  for (var index = 0; index < SIZE; index += 1) {
    ROWS[index] = Math.floor(index / 9);
    COLUMNS[index] = index % 9;
    BOXES[index] = Math.floor(ROWS[index] / 3) * 3 + Math.floor(COLUMNS[index] / 3);
  }

  function copyBoard(board) {
    if (!Array.isArray(board) || board.length !== SIZE) {
      throw new TypeError('A Sudoku board must be an array of 81 integers.');
    }
    var copy = board.slice();
    for (var i = 0; i < SIZE; i += 1) {
      if (!Number.isInteger(copy[i]) || copy[i] < 0 || copy[i] > 9) {
        throw new RangeError('Sudoku cells must be integers from 0 to 9.');
      }
    }
    return copy;
  }

  function createState(board) {
    var state = {
      board: copyBoard(board),
      rows: new Uint16Array(9),
      columns: new Uint16Array(9),
      boxes: new Uint16Array(9)
    };
    for (var i = 0; i < SIZE; i += 1) {
      var value = state.board[i];
      if (value === 0) continue;
      var bit = 1 << (value - 1);
      var row = ROWS[i];
      var column = COLUMNS[i];
      var box = BOXES[i];
      if ((state.rows[row] | state.columns[column] | state.boxes[box]) & bit) {
        return null;
      }
      state.rows[row] |= bit;
      state.columns[column] |= bit;
      state.boxes[box] |= bit;
    }
    return state;
  }

  function shuffle(values, random) {
    for (var i = values.length - 1; i > 0; i -= 1) {
      var sample = random();
      if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
        throw new RangeError('The random function must return a number in [0, 1).');
      }
      var other = Math.floor(sample * (i + 1));
      var temporary = values[i];
      values[i] = values[other];
      values[other] = temporary;
    }
    return values;
  }

  // Pick the empty cell with the fewest candidates (MRV). The same search
  // counts solutions and optionally records the first completed board.
  function search(state, limit, random, captureSolution) {
    var count = 0;
    var solution = null;

    function visit() {
      var chosen = -1;
      var chosenMask = 0;
      var fewest = 10;
      for (var i = 0; i < SIZE; i += 1) {
        if (state.board[i] !== 0) continue;
        var available = ALL_DIGITS & ~(state.rows[ROWS[i]] |
          state.columns[COLUMNS[i]] | state.boxes[BOXES[i]]);
        var candidateCount = BIT_COUNTS[available];
        if (candidateCount === 0) return;
        if (candidateCount < fewest) {
          chosen = i;
          chosenMask = available;
          fewest = candidateCount;
          if (fewest === 1) break;
        }
      }

      if (chosen === -1) {
        count += 1;
        if (captureSolution && solution === null) solution = state.board.slice();
        return;
      }

      var choices = [];
      while (chosenMask !== 0) {
        var candidateBit = chosenMask & -chosenMask;
        choices.push(candidateBit);
        chosenMask ^= candidateBit;
      }
      if (random) shuffle(choices, random);

      var row = ROWS[chosen];
      var column = COLUMNS[chosen];
      var box = BOXES[chosen];
      for (var choice = 0; choice < choices.length && count < limit; choice += 1) {
        var bit = choices[choice];
        state.board[chosen] = BIT_DIGITS[bit];
        state.rows[row] |= bit;
        state.columns[column] |= bit;
        state.boxes[box] |= bit;
        visit();
        state.rows[row] ^= bit;
        state.columns[column] ^= bit;
        state.boxes[box] ^= bit;
        state.board[chosen] = 0;
      }
    }

    visit();
    return { count: count, solution: solution };
  }

  function countSolutions(board, limit) {
    if (limit === undefined) limit = 2;
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('The solution limit must be a positive integer.');
    }
    var state = createState(board);
    return state === null ? 0 : search(state, limit, null, false).count;
  }

  function getCandidates(board, index) {
    var cells = copyBoard(board);
    if (!Number.isInteger(index) || index < 0 || index >= SIZE) {
      throw new RangeError('The cell index must be an integer from 0 to 80.');
    }
    if (cells[index] !== 0) return [];
    var used = 0;
    for (var i = 0; i < SIZE; i += 1) {
      if (cells[i] !== 0 && (ROWS[i] === ROWS[index] ||
          COLUMNS[i] === COLUMNS[index] || BOXES[i] === BOXES[index])) {
        used |= 1 << (cells[i] - 1);
      }
    }
    var candidates = [];
    for (var value = 1; value <= 9; value += 1) {
      if (!(used & (1 << (value - 1)))) candidates.push(value);
    }
    return candidates;
  }

  function getConflicts(board) {
    var cells = copyBoard(board);
    var conflicts = new Uint8Array(SIZE);
    for (var i = 0; i < SIZE; i += 1) {
      if (cells[i] === 0) continue;
      for (var other = i + 1; other < SIZE; other += 1) {
        if (cells[i] === cells[other] && (ROWS[i] === ROWS[other] ||
            COLUMNS[i] === COLUMNS[other] || BOXES[i] === BOXES[other])) {
          conflicts[i] = 1;
          conflicts[other] = 1;
        }
      }
    }
    var indices = [];
    for (var cell = 0; cell < SIZE; cell += 1) {
      if (conflicts[cell]) indices.push(cell);
    }
    return indices;
  }

  function isComplete(board) {
    var state = createState(board);
    return state !== null && state.board.every(function (value) { return value !== 0; });
  }

  function generatePuzzle(difficulty, optionalRandom) {
    if (difficulty === undefined) difficulty = 'medium';
    if (!Object.prototype.hasOwnProperty.call(CLUE_TARGETS, difficulty)) {
      throw new RangeError('Difficulty must be easy, medium, or hard.');
    }
    var random = optionalRandom === undefined ? Math.random : optionalRandom;
    if (typeof random !== 'function') {
      throw new TypeError('The random source must be a function.');
    }

    var target = CLUE_TARGETS[difficulty];
    var best = null;
    // A finite number of passes bounds generation work. Keep extra clues if
    // removing them would lose the unique solution; never force the target.
    for (var attempt = 0; attempt < 3; attempt += 1) {
      var emptyBoard = new Array(SIZE).fill(0);
      var solution = search(createState(emptyBoard), 1, random, true).solution;
      var puzzle = solution.slice();
      puzzle[40] = 0;
      var clueCount = 80;
      var pairs = [];
      for (var pair = 0; pair < 40; pair += 1) pairs.push(pair);
      shuffle(pairs, random);

      for (var position = 0; position < pairs.length && clueCount > target; position += 1) {
        var first = pairs[position];
        var second = SIZE - 1 - first;
        var firstValue = puzzle[first];
        var secondValue = puzzle[second];
        puzzle[first] = 0;
        puzzle[second] = 0;
        if (countSolutions(puzzle, 2) === 1) {
          clueCount -= 2;
        } else {
          puzzle[first] = firstValue;
          puzzle[second] = secondValue;
        }
      }

      if (best === null || clueCount < best.clueCount) {
        best = {
          puzzle: puzzle,
          solution: solution,
          difficulty: difficulty,
          clueCount: clueCount
        };
      }
      if (clueCount === target) break;
    }
    return best;
  }

  return {
    generatePuzzle: generatePuzzle,
    countSolutions: countSolutions,
    getCandidates: getCandidates,
    getConflicts: getConflicts,
    isComplete: isComplete
  };
});
