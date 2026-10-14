(function (root, factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./sudoku-engine.js'));
  } else {
    root.SudokuGame = factory(root.SudokuEngine);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (engine) {
  'use strict';

  var SIZE = 81;
  var HISTORY_LIMIT = 200;
  var DIFFICULTIES = ['easy', 'medium', 'hard'];

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isCells(cells, minimum, maximum) {
    return Array.isArray(cells) && cells.length === SIZE &&
      cells.every(function (value) {
        return Number.isInteger(value) && value >= minimum && value <= maximum;
      });
  }

  function isValidPuzzle(data) {
    if (!isObject(data) || !isCells(data.puzzle, 0, 9) ||
        !isCells(data.solution, 1, 9) || DIFFICULTIES.indexOf(data.difficulty) === -1 ||
        !Number.isInteger(data.clueCount) || data.clueCount < 0 || data.clueCount > SIZE) {
      return false;
    }
    var clues = 0;
    for (var index = 0; index < SIZE; index += 1) {
      if (data.puzzle[index] === 0) continue;
      clues += 1;
      if (data.puzzle[index] !== data.solution[index]) return false;
    }
    return clues === data.clueCount && engine.isComplete(data.solution) &&
      engine.countSolutions(data.puzzle, 2) === 1;
  }

  function isIndex(index) {
    return Number.isInteger(index) && index >= 0 && index < SIZE;
  }

  function sameUnit(first, second) {
    var firstRow = Math.floor(first / 9);
    var secondRow = Math.floor(second / 9);
    var firstColumn = first % 9;
    var secondColumn = second % 9;
    return firstRow === secondRow || firstColumn === secondColumn ||
      (Math.floor(firstRow / 3) === Math.floor(secondRow / 3) &&
       Math.floor(firstColumn / 3) === Math.floor(secondColumn / 3));
  }

  function makeGame(state) {
    var undoStack = [];
    var redoStack = [];

    function snapshot() {
      return {
        board: state.board.slice(),
        notes: state.notes.slice()
      };
    }

    // Time and hints count actual use in this session; undo only changes cells.
    function applySnapshot(saved) {
      state.board = saved.board.slice();
      state.notes = saved.notes.slice();
      state.completed = engine.isComplete(state.board);
    }

    function remember() {
      undoStack.push(snapshot());
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      redoStack.length = 0;
    }

    function editable(index) {
      return !state.paused && !state.completed && isIndex(index) && state.puzzle[index] === 0;
    }

    function fill(index, digit) {
      state.board[index] = digit;
      state.notes[index] = 0;
      if (digit !== 0) {
        var bit = 1 << (digit - 1);
        for (var peer = 0; peer < SIZE; peer += 1) {
          if (sameUnit(index, peer)) state.notes[peer] &= ~bit;
        }
      }
      state.completed = engine.isComplete(state.board);
    }

    var game = {
      state: state,

      enter: function (index, digit, noteMode) {
        if (!editable(index) || !Number.isInteger(digit) || digit < 1 || digit > 9) return false;
        if (noteMode === true) {
          if (state.board[index] !== 0) return false;
          remember();
          state.notes[index] ^= 1 << (digit - 1);
        } else {
          remember();
          // Pressing the cell's current digit again clears it.
          fill(index, state.board[index] === digit ? 0 : digit);
        }
        return true;
      },

      erase: function (index) {
        if (!editable(index) || (state.board[index] === 0 && state.notes[index] === 0)) return false;
        remember();
        fill(index, 0);
        return true;
      },

      undo: function () {
        if (state.paused || undoStack.length === 0) return false;
        redoStack.push(snapshot());
        applySnapshot(undoStack.pop());
        return true;
      },

      redo: function () {
        if (state.paused || redoStack.length === 0) return false;
        undoStack.push(snapshot());
        applySnapshot(redoStack.pop());
        return true;
      },

      hint: function (index) {
        if (state.paused || state.completed) return null;
        var chosen = null;
        if (isIndex(index) && state.puzzle[index] === 0 && state.board[index] !== state.solution[index]) {
          chosen = index;
        } else {
          for (var candidate = 0; candidate < SIZE; candidate += 1) {
            if (state.puzzle[candidate] === 0 && state.board[candidate] !== state.solution[candidate]) {
              chosen = candidate;
              break;
            }
          }
        }
        if (chosen === null) return null;
        remember();
        fill(chosen, state.solution[chosen]);
        state.hintsUsed += 1;
        return chosen;
      },

      check: function () {
        var mistakes = [];
        for (var index = 0; index < SIZE; index += 1) {
          if (state.board[index] !== 0 && state.board[index] !== state.solution[index]) mistakes.push(index);
        }
        return mistakes;
      },

      reset: function () {
        state.board = state.puzzle.slice();
        state.notes = new Array(SIZE).fill(0);
        state.elapsedMs = 0;
        state.paused = false;
        state.hintsUsed = 0;
        state.completed = engine.isComplete(state.board);
        undoStack.length = 0;
        redoStack.length = 0;
        return true;
      }
    };

    Object.defineProperties(game, {
      canUndo: { enumerable: true, get: function () { return undoStack.length !== 0; } },
      canRedo: { enumerable: true, get: function () { return redoStack.length !== 0; } }
    });
    return game;
  }

  function create(puzzleData) {
    if (!isValidPuzzle(puzzleData)) throw new TypeError('A game requires a valid puzzle with one solution.');
    return makeGame({
      puzzle: Object.freeze(puzzleData.puzzle.slice()),
      solution: Object.freeze(puzzleData.solution.slice()),
      board: puzzleData.puzzle.slice(),
      notes: new Array(SIZE).fill(0),
      difficulty: puzzleData.difficulty,
      clueCount: puzzleData.clueCount,
      elapsedMs: 0,
      paused: false,
      hintsUsed: 0,
      completed: engine.isComplete(puzzleData.puzzle)
    });
  }

  function serialize(game) {
    var state = game.state;
    return JSON.stringify({
      version: 1,
      state: {
        puzzle: state.puzzle,
        solution: state.solution,
        board: state.board,
        notes: state.notes,
        difficulty: state.difficulty,
        clueCount: state.clueCount,
        elapsedMs: state.elapsedMs,
        paused: state.paused,
        hintsUsed: state.hintsUsed,
        completed: state.completed
      }
    });
  }

  function restore(serializedString) {
    try {
      // A version 1 save is a few kilobytes; bound unexpected inputs before parsing.
      if (typeof serializedString !== 'string' || serializedString.length > 20000) return null;
      var saved = JSON.parse(serializedString);
      if (!isObject(saved) || saved.version !== 1 || !isValidPuzzle(saved.state)) return null;
      var state = saved.state;
      if (!isCells(state.board, 0, 9) || !isCells(state.notes, 0, 511) ||
          typeof state.elapsedMs !== 'number' || !Number.isFinite(state.elapsedMs) || state.elapsedMs < 0 ||
          typeof state.paused !== 'boolean' || typeof state.completed !== 'boolean' ||
          !Number.isSafeInteger(state.hintsUsed) || state.hintsUsed < 0) {
        return null;
      }
      for (var index = 0; index < SIZE; index += 1) {
        if (state.puzzle[index] !== 0 && state.board[index] !== state.puzzle[index]) return null;
        if (state.board[index] !== 0 && state.notes[index] !== 0) return null;
      }
      if (state.completed !== engine.isComplete(state.board)) return null;
      if (state.completed && state.paused) return null;
      var game = create(state);
      game.state.board = state.board.slice();
      game.state.notes = state.notes.slice();
      game.state.elapsedMs = state.elapsedMs;
      game.state.paused = state.paused;
      game.state.hintsUsed = state.hintsUsed;
      game.state.completed = state.completed;
      return game;
    } catch (error) {
      return null;
    }
  }

  return { create: create, serialize: serialize, restore: restore };
});
