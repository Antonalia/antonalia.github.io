(function () {
  'use strict';

  const engine = window.SudokuEngine;
  const model = window.SudokuGame;
  const storageKey = 'lele-sudoku-v1';
  const names = { easy: '简单', medium: '中等', hard: '困难' };
  const byId = (id) => document.getElementById(id);
  const board = byId('board');
  const cells = [];
  const digits = Array.from(document.querySelectorAll('[data-digit]'));
  const controls = ['restart-game', 'pause-game', 'notes-mode', 'erase', 'undo', 'redo', 'check', 'hint'];
  let game = null;
  let selected = 0;
  let notesMode = false;
  let wrong = new Set();
  let loading = false;
  let lastTick = performance.now();
  let lastSave = lastTick;

  function announce(message, tone = 'info') {
    byId('status').textContent = message;
    byId('feedback-bubble').dataset.tone = tone;
  }

  if (!engine || !model) {
    announce('游戏文件加载失败，请刷新页面重试。');
    byId('new-game').disabled = true;
    board.setAttribute('aria-busy', 'false');
    return;
  }

  function clock() {
    const now = performance.now();
    if (game && !loading && !game.state.paused && !game.state.completed && !document.hidden) {
      game.state.elapsedMs += Math.max(0, now - lastTick);
    }
    lastTick = now;
    const seconds = game ? Math.floor(game.state.elapsedMs / 1000) : 0;
    const parts = [Math.floor(seconds / 60) % 60, seconds % 60];
    if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600));
    byId('timer').textContent = parts.map((part) => String(part).padStart(2, '0')).join(':');
  }

  function save() {
    if (!game) return;
    try {
      localStorage.setItem(storageKey, model.serialize(game));
      byId('save-status').textContent = '进度已自动保存到当前浏览器。';
    } catch (error) {
      byId('save-status').textContent = '当前浏览器无法保存进度，关闭或刷新后可能丢失本题。';
    }
    lastSave = performance.now();
  }

  function peers(a, b) {
    const rowA = Math.floor(a / 9);
    const rowB = Math.floor(b / 9);
    const colA = a % 9;
    const colB = b % 9;
    return rowA === rowB || colA === colB ||
      (Math.floor(rowA / 3) === Math.floor(rowB / 3) && Math.floor(colA / 3) === Math.floor(colB / 3));
  }

  function render() {
    const state = game && game.state;
    const blocked = !state || loading || state.paused;
    const editable = !blocked && !state.completed && !state.puzzle[selected];
    const conflicts = state && byId('show-conflicts').checked ? new Set(engine.getConflicts(state.board)) : new Set();
    board.setAttribute('aria-busy', String(loading));
    board.setAttribute('aria-hidden', String(Boolean(state && state.paused)));
    byId('board-wrapper').classList.toggle('is-paused', Boolean(state && state.paused));
    byId('sudoku-app').classList.toggle('is-complete', Boolean(state && state.completed));
    byId('sudoku-app').classList.toggle('is-notes-mode', notesMode);
    byId('pause-cover').hidden = !(state && state.paused);

    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const value = state ? state.board[index] : 0;
      const given = Boolean(state && state.puzzle[index]);
      const mask = state ? state.notes[index] : 0;
      cell.disabled = blocked;
      cell.tabIndex = index === selected ? 0 : -1;
      cell.setAttribute('aria-selected', String(index === selected));
      cell.setAttribute('aria-readonly', String(given || Boolean(state && state.completed)));
      cell.className = 'cell';
      if (given) cell.classList.add('given');
      if (index === selected) cell.classList.add('selected');
      else if (peers(index, selected)) cell.classList.add('peer');
      if (state && value && value === state.board[selected]) cell.classList.add('same-value');
      if (conflicts.has(index)) cell.classList.add('conflict');
      if (wrong.has(index)) cell.classList.add('wrong');
      cell.replaceChildren();
      const noteDigits = [];
      if (value) cell.textContent = String(value);
      else if (mask) {
        const notes = document.createElement('span');
        notes.className = 'cell-notes';
        notes.setAttribute('aria-hidden', 'true');
        for (let digit = 1; digit <= 9; digit += 1) {
          const note = document.createElement('span');
          if (mask & (1 << (digit - 1))) {
            note.textContent = String(digit);
            noteDigits.push(digit);
          }
          notes.appendChild(note);
        }
        cell.appendChild(notes);
      }
      let label = `第${Math.floor(index / 9) + 1}行第${index % 9 + 1}列，${value || '空格'}`;
      if (given) label += '，预填数字';
      if (noteDigits.length) label += `，笔记${noteDigits.join('、')}`;
      if (conflicts.has(index) || wrong.has(index)) label += '，有错误';
      cell.setAttribute('aria-label', label);
    }

    byId('new-game').disabled = loading;
    byId('difficulty').disabled = loading;
    for (const id of controls) byId(id).disabled = blocked;
    byId('restart-game').disabled = !state || loading;
    byId('pause-game').disabled = !state || loading || state.completed;
    byId('pause-game').querySelector('[data-label]').textContent = state && state.paused ? '继续' : '暂停';
    byId('pause-icon').setAttribute('href', state && state.paused ? '#icon-play' : '#icon-pause');
    byId('notes-mode').disabled = blocked || Boolean(state && state.completed);
    byId('notes-mode').setAttribute('aria-pressed', String(notesMode));
    byId('notes-mode').querySelector('[data-label]').textContent = `笔记：${notesMode ? '开' : '关'}`;
    byId('erase').disabled = !editable || !(state.board[selected] || state.notes[selected]);
    byId('undo').disabled = blocked || !game.canUndo;
    byId('redo').disabled = blocked || !game.canRedo;
    byId('hint').disabled = blocked || Boolean(state && state.completed);
    for (const button of digits) {
      button.disabled = !editable;
      const digit = Number(button.dataset.digit);
      const remaining = state ? Math.max(0, 9 - state.board.filter((value) => value === digit).length) : 9;
      button.querySelector('[data-count]').textContent = `剩 ${remaining}`;
      button.setAttribute('aria-label', `填写数字 ${digit}，剩余 ${remaining} 个`);
      button.classList.toggle('digit-complete', remaining === 0);
    }

    if (!state) return;
    byId('game-difficulty').textContent = `${names[state.difficulty]} · 预填 ${state.clueCount} 格`;
    byId('remaining').textContent = `剩余 ${state.board.filter((value) => !value).length} 格`;
    byId('hint-count').textContent = String(state.hintsUsed);
    if (state.paused) byId('selection-info').textContent = '游戏已暂停。';
    else {
      const cellType = state.puzzle[selected] ? '预填格，不能修改' : (notesMode ? '笔记模式' : '填数模式');
      byId('selection-info').textContent = `已选第 ${Math.floor(selected / 9) + 1} 行、第 ${selected % 9 + 1} 列（${cellType}）`;
    }
    clock();
  }

  function changed(message) {
    wrong.clear();
    render();
    if (game.state.completed) announce(`恭喜完成数独！用时 ${byId('timer').textContent}，使用了 ${game.state.hintsUsed} 次提示。`, 'success');
    else announce(message);
    save();
  }

  function enter(digit) {
    if (!game || loading) return;
    clock();
    if (game.enter(selected, digit, notesMode)) changed(notesMode ? '笔记已更新。' : '数字已更新。');
    else if (game.state.puzzle[selected]) announce('这是预填数字，不能修改。');
    else if (notesMode && game.state.board[selected]) announce('请先清空当前格，再添加笔记。');
  }

  function perform(method, message) {
    if (!game || loading) return;
    clock();
    if (game[method]()) changed(message);
  }

  function hasProgress() {
    return game && (game.state.hintsUsed > 0 || game.state.board.some((value, index) => value !== game.state.puzzle[index]) || game.state.notes.some(Boolean));
  }

  function newGame(ask) {
    if (loading) return;
    if (ask && hasProgress() && !window.confirm('开始新题会替换当前存档，确定开始吗？')) return;
    clock();
    loading = true;
    render();
    announce('正在生成唯一解题目……');
    window.setTimeout(() => {
      try {
        game = model.create(engine.generatePuzzle(byId('difficulty').value));
        selected = game.state.puzzle.indexOf(0);
        if (selected < 0) selected = 0;
        notesMode = false;
        wrong.clear();
        lastTick = performance.now();
        loading = false;
        render();
        announce('新题已就绪，选择空格开始吧。');
        save();
      } catch (error) {
        loading = false;
        render();
        announce('出题失败，请点击“新游戏”重试。', 'warning');
      }
    }, 20);
  }

  for (let row = 0; row < 9; row += 1) {
    const rowElement = document.createElement('div');
    rowElement.className = 'sudoku-row';
    rowElement.setAttribute('role', 'row');
    for (let col = 0; col < 9; col += 1) {
      const index = row * 9 + col;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(index);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-rowindex', String(row + 1));
      cell.setAttribute('aria-colindex', String(col + 1));
      cell.addEventListener('click', () => {
        selected = index;
        render();
      });
      cell.addEventListener('focus', () => {
        if (selected !== index) {
          selected = index;
          render();
        }
      });
      cells.push(cell);
      rowElement.appendChild(cell);
    }
    board.appendChild(rowElement);
  }

  for (const button of digits) button.addEventListener('click', () => enter(Number(button.dataset.digit)));
  byId('new-game').addEventListener('click', () => newGame(true));
  byId('restart-game').addEventListener('click', () => {
    if (!game || loading) return;
    if (hasProgress() && !window.confirm('重玩本题会清空填写、笔记和用时，确定重玩吗？')) return;
    game.reset();
    notesMode = false;
    lastTick = performance.now();
    changed('已重新开始本题。');
  });
  byId('pause-game').addEventListener('click', () => {
    if (!game || loading || game.state.completed) return;
    clock();
    game.state.paused = !game.state.paused;
    lastTick = performance.now();
    render();
    announce(game.state.paused ? '游戏已暂停。' : '游戏已继续。');
    save();
  });
  byId('resume-game').addEventListener('click', () => byId('pause-game').click());
  byId('notes-mode').addEventListener('click', () => {
    notesMode = !notesMode;
    render();
    announce(notesMode ? '笔记模式已开启。' : '笔记模式已关闭。');
  });
  byId('erase').addEventListener('click', () => {
    if (!game || loading) return;
    clock();
    if (game.erase(selected)) changed('当前格已清空。');
  });
  byId('undo').addEventListener('click', () => perform('undo', '已撤销一步。'));
  byId('redo').addEventListener('click', () => perform('redo', '已重做一步。'));
  byId('check').addEventListener('click', () => {
    if (!game || loading || game.state.paused) return;
    wrong = new Set(game.check());
    render();
    if (wrong.size) announce(`发现 ${wrong.size} 个错误数字，已标记。`, 'warning');
    else if (game.state.completed) announce('本题已全部正确完成。', 'success');
    else announce('当前已填数字正确，继续填写剩余空格吧。');
  });
  byId('hint').addEventListener('click', () => {
    if (!game || loading) return;
    clock();
    const index = game.hint(selected);
    if (index !== null) {
      selected = index;
      changed(`已填入第 ${Math.floor(index / 9) + 1} 行、第 ${index % 9 + 1} 列的答案。`);
    }
  });
  byId('show-conflicts').addEventListener('change', render);

  byId('sudoku-app').addEventListener('keydown', (event) => {
    if (!game || loading || game.state.paused || event.target.matches('select, input, summary, a')) return;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault();
      perform(event.shiftKey ? 'redo' : 'undo', event.shiftKey ? '已重做一步。' : '已撤销一步。');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'y') {
      event.preventDefault();
      perform('redo', '已重做一步。');
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[1-9]$/.test(key)) {
      event.preventDefault();
      enter(Number(key));
    } else if (key === 'delete' || key === 'backspace' || key === '0') {
      event.preventDefault();
      clock();
      if (game.erase(selected)) changed('当前格已清空。');
    } else if (key === 'n' && !game.state.completed) {
      event.preventDefault();
      byId('notes-mode').click();
    } else if (event.target.closest('#board') && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
      const row = Math.floor(selected / 9);
      const col = selected % 9;
      if (key === 'arrowup') selected = ((row + 8) % 9) * 9 + col;
      if (key === 'arrowdown') selected = ((row + 1) % 9) * 9 + col;
      if (key === 'arrowleft') selected = row * 9 + ((col + 8) % 9);
      if (key === 'arrowright') selected = row * 9 + ((col + 1) % 9);
      render();
      cells[selected].focus();
    }
  });

  document.addEventListener('visibilitychange', () => {
    // Account for the last visible interval before pausing the clock.
    if (document.hidden && game && !game.state.paused && !game.state.completed && !loading) {
      game.state.elapsedMs += Math.max(0, performance.now() - lastTick);
    }
    lastTick = performance.now();
    clock();
    save();
  });
  window.addEventListener('pagehide', () => { clock(); save(); });
  window.setInterval(() => {
    clock();
    if (game && !loading && performance.now() - lastSave >= 5000) save();
  }, 500);

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      game = model.restore(saved);
      if (!game) announce('旧存档无法读取，正在开始新题。');
    }
  } catch (error) {
    byId('save-status').textContent = '当前浏览器无法读取存档。';
  }
  if (game) {
    selected = game.state.puzzle.indexOf(0);
    if (selected < 0) selected = 0;
    byId('difficulty').value = game.state.difficulty;
    lastTick = performance.now();
    render();
    announce(game.state.completed ? '已恢复完成的数独。点击“新游戏”继续挑战。' : (game.state.paused ? '已恢复上次进度，点击“继续”开始。' : '已恢复上次进度。'));
  } else newGame(false);
}());
