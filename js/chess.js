(function () {
    'use strict';

    const PIECES = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    const FEN_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const DEPTH = { dumb: 0, easy: 1, medium: 2, hard: 3 };
    const PIECE_VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000, p: -100, n: -320, b: -330, r: -500, q: -900, k: -20000 };

    let board = [];
    let turn = 'w';
    let castling = { K: true, Q: true, k: true, q: true };
    let ep = null;
    let halfmove = 0;
    let fullmove = 1;
    let lastMove = null;
    let selected = null;
    let validMoves = [];
    let mode = 'pvc'; // 'pvc' or 'local'
    let difficulty = 'easy';
    let gameOver = false;
    let movesAllowed = false; // Controls if pieces can be moved
    let moveHistory = [];
    let capturedWhite = []; // Pieces White has taken
    let capturedBlack = []; // Pieces Black has taken


    // Timer State
    let timeWhite = 0;
    let timeBlack = 0;
    let timerInterval = null;
    let lastTime = 0;

    const boardEl = document.getElementById('chess-board');
    const statusEl = document.getElementById('status-text');
    const moveWhiteEl = document.getElementById('move-log-white');
    const moveBlackEl = document.getElementById('move-log-black');
    const capturesWhiteEl = document.getElementById('white-captures');
    const capturesBlackEl = document.getElementById('black-captures');
    const clockWhiteEl = document.getElementById('clock-white');
    const clockBlackEl = document.getElementById('clock-black');
    const clockContainer = document.querySelector('.clock-container');
    const btnNew = document.getElementById('btn-new-game');
    const btnStart = document.getElementById('btn-start-game');
    const diffRow = document.getElementById('difficulty-row');

    const ANIM_DURATION_MS = 280;
    let animating = false;

    function parseFen(fen) {
        const parts = fen.split(/\s+/);
        const ranks = parts[0].split('/');
        board = [];
        for (let r = 0; r < 8; r++) {
            const row = [];
            for (const c of ranks[r]) {
                if (/[1-8]/.test(c)) {
                    for (let i = 0; i < +c; i++) row.push(null);
                } else {
                    row.push(c);
                }
            }
            board.push(row);
        }
        turn = parts[1];
        castling = { K: parts[2].includes('K'), Q: parts[2].includes('Q'), k: parts[2].includes('k'), q: parts[2].includes('q') };
        ep = parts[3] === '-' ? null : { r: 8 - parseInt(parts[3][1], 10), c: parts[3].charCodeAt(0) - 97 };
        halfmove = parseInt(parts[4], 10);
        fullmove = parseInt(parts[5], 10);
    }

    function isWhite(p) {
        return p && p === p.toUpperCase();
    }

    function isBlack(p) {
        return p && p === p.toLowerCase();
    }

    function ownPiece(p) {
        return (turn === 'w' && isWhite(p)) || (turn === 'b' && isBlack(p));
    }

    function oppPiece(p) {
        return (turn === 'w' && isBlack(p)) || (turn === 'b' && isWhite(p));
    }

    function inBounds(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    function addMove(moves, fr, fc, tr, tc, flags = {}) {
        const pc = board[fr][fc];
        const cap = board[tr][tc];
        if (cap && (isWhite(pc) === isWhite(cap))) return;
        moves.push({ from: { r: fr, c: fc }, to: { r: tr, c: tc }, piece: pc, captured: cap, flags });
    }

    function getMovesFrom(r, c) {
        const moves = [];
        const p = board[r][c];
        if (!p || !ownPiece(p)) return moves;
        const u = p.toUpperCase();

        const slide = (dr, dc) => {
            for (let i = 1; i < 8; i++) {
                const nr = r + dr * i, nc = c + dc * i;
                if (!inBounds(nr, nc)) break;
                if (!board[nr][nc]) {
                    addMove(moves, r, c, nr, nc);
                } else {
                    if (oppPiece(board[nr][nc])) addMove(moves, r, c, nr, nc);
                    break;
                }
            }
        };

        const jump = (offsets) => {
            for (const [dr, dc] of offsets) {
                const nr = r + dr, nc = c + dc;
                if (!inBounds(nr, nc)) continue;
                if (!board[nr][nc] || oppPiece(board[nr][nc])) addMove(moves, r, c, nr, nc);
            }
        };

        if (u === 'P') {
            const forward = turn === 'w' ? -1 : 1;
            const start = turn === 'w' ? 6 : 1;
            if (inBounds(r + forward, c) && !board[r + forward][c]) {
                addMove(moves, r, c, r + forward, c);
                if (r === start && !board[r + 2 * forward][c]) addMove(moves, r, c, r + 2 * forward, c);
            }
            for (const dc of [-1, 1]) {
                const nr = r + forward, nc = c + dc;
                if (!inBounds(nr, nc)) continue;
                if (board[nr][nc] && oppPiece(board[nr][nc])) addMove(moves, r, c, nr, nc);
                if (ep && ep.r === nr && ep.c === nc) addMove(moves, r, c, nr, nc, { ep: true });
            }
        } else if (u === 'N') {
            jump([[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]]);
        } else if (u === 'B') {
            slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1);
        } else if (u === 'R') {
            slide(1, 0); slide(-1, 0); slide(0, 1); slide(0, -1);
        } else if (u === 'Q') {
            slide(1, 0); slide(-1, 0); slide(0, 1); slide(0, -1);
            slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1);
        } else if (u === 'K') {
            jump([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]);
            const row = turn === 'w' ? 7 : 0;
            if (r === row && c === 4) {
                if (castling[turn === 'w' ? 'K' : 'k'] && !board[row][5] && !board[row][6] && !board[row][7])
                    addMove(moves, r, c, row, 6, { castle: 'k' });
                if (castling[turn === 'w' ? 'Q' : 'q'] && !board[row][1] && !board[row][2] && !board[row][3])
                    addMove(moves, r, c, row, 2, { castle: 'q' });
            }
        }
        return moves;
    }

    function allMoves() {
        const list = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                list.push(...getMovesFrom(r, c));
            }
        }
        return list;
    }

    function cloneBoard() {
        return board.map(row => [...row]);
    }

    function makeMove(m, opts = {}) {
        const { from, to, piece, captured, flags } = m;
        const promo = opts.promotion || 'Q';
        const pc = piece.toUpperCase();
        const isP = pc === 'P';

        if (flags?.castle) {
            const row = turn === 'w' ? 7 : 0;
            if (flags.castle === 'k') {
                board[row][4] = null;
                board[row][6] = turn === 'w' ? 'K' : 'k';
                board[row][5] = turn === 'w' ? 'R' : 'r';
                board[row][7] = null;
            } else {
                board[row][4] = null;
                board[row][2] = turn === 'w' ? 'K' : 'k';
                board[row][3] = turn === 'w' ? 'R' : 'r';
                board[row][0] = null;
            }
            castling[turn === 'w' ? 'K' : 'k'] = false;
            castling[turn === 'w' ? 'Q' : 'q'] = false;
        } else {
            board[from.r][from.c] = null;
            let placed = piece;
            if (isP && (to.r === 0 || to.r === 7)) {
                placed = turn === 'w' ? promo : promo.toLowerCase();
            }
            board[to.r][to.c] = placed;
            if (flags?.ep) {
                const forward = turn === 'w' ? -1 : 1;
                board[to.r - forward][to.c] = null;
            }
            if (piece === 'K' || piece === 'k') {
                castling[piece === 'K' ? 'K' : 'k'] = false;
                castling[piece === 'K' ? 'Q' : 'q'] = false;
            }
            if (piece === 'R' || piece === 'r') {
                if (from.c === 0) castling[piece === 'R' ? 'Q' : 'q'] = false;
                if (from.c === 7) castling[piece === 'R' ? 'K' : 'k'] = false;
            }
        }

        ep = null;
        if (isP && Math.abs(from.r - to.r) === 2) {
            ep = { r: (from.r + to.r) / 2, c: from.c };
        }
        halfmove = (isP || captured) ? 0 : halfmove + 1;
        if (turn === 'b') fullmove++;
        if (captured && !opts.simulation) {
            if (turn === 'w') capturedWhite.push(captured);
            else capturedBlack.push(captured);
        }
        turn = turn === 'w' ? 'b' : 'w';
        lastMove = { from, to };
    }

    function wouldBeInCheck(m) {
        const saved = cloneBoard();
        const savedTurn = turn;
        const savedCastling = { ...castling };
        const savedEp = ep ? { ...ep } : null;
        const savedHalf = halfmove, savedFull = fullmove;
        const savedCW = [...capturedWhite], savedCB = [...capturedBlack];

        makeMove(m, { simulation: true });
        const inCheck = isInCheck(savedTurn);
        board = saved;
        turn = savedTurn;
        castling = savedCastling;
        ep = savedEp;
        halfmove = savedHalf;
        fullmove = savedFull;
        capturedWhite = savedCW;
        capturedBlack = savedCB;
        lastMove = null;
        return inCheck;
    }

    function isInCheck(side) {
        let kr = -1, kc = -1;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && ((side === 'w' && p === 'K') || (side === 'b' && p === 'k'))) {
                    kr = r; kc = c;
                    break;
                }
            }
            if (kr >= 0) break;
        }
        const prev = turn;
        const kingPiece = board[kr][kc];
        board[kr][kc] = null;
        turn = side === 'w' ? 'b' : 'w';
        const all = allMoves();
        turn = prev;
        board[kr][kc] = kingPiece;
        return all.some(m => m.to.r === kr && m.to.c === kc);
    }

    function legalMoves() {
        const raw = allMoves();
        return raw.filter(m => !wouldBeInCheck(m));
    }

    function isStalemate() {
        return legalMoves().length === 0 && !isInCheck(turn);
    }

    function isCheckmate() {
        return legalMoves().length === 0 && isInCheck(turn);
    }

    function evaluate() {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p) score += PIECE_VAL[p] || 0;
            }
        }
        return score;
    }

    function minimax(depth, alpha, beta, maximizing) {
        if (depth === 0) return evaluate();
        const moves = legalMoves();
        if (moves.length === 0) {
            if (isInCheck(turn)) return maximizing ? -1e6 : 1e6;
            return 0;
        }
        if (maximizing) {
            let best = -1e9;
            for (const m of moves) {
                const saved = cloneBoard();
                const savedTurn = turn;
                const savedCastling = { ...castling };
                const savedEp = ep ? { ...ep } : null;
                const savedCW = [...capturedWhite], savedCB = [...capturedBlack];
                makeMove(m, { simulation: true });
                const v = minimax(depth - 1, alpha, beta, false);
                board = saved;
                turn = savedTurn;
                castling = savedCastling;
                ep = savedEp;
                capturedWhite = savedCW;
                capturedBlack = savedCB;
                best = Math.max(best, v);
                alpha = Math.max(alpha, v);
                if (beta <= alpha) break;
            }
            return best;
        } else {
            let best = 1e9;
            for (const m of moves) {
                const saved = cloneBoard();
                const savedTurn = turn;
                const savedCastling = { ...castling };
                const savedEp = ep ? { ...ep } : null;
                const savedCW = [...capturedWhite], savedCB = [...capturedBlack];
                makeMove(m, { simulation: true });
                const v = minimax(depth - 1, alpha, beta, true);
                board = saved;
                turn = savedTurn;
                castling = savedCastling;
                ep = savedEp;
                capturedWhite = savedCW;
                capturedBlack = savedCB;
                best = Math.min(best, v);
                beta = Math.min(beta, v);
                if (beta <= alpha) break;
            }
            return best;
        }
    }

    function aiMove() {
        const moves = legalMoves();
        if (moves.length === 0) return null;
        const d = DEPTH[difficulty] || 0;
        if (d === 0) {
            return moves[Math.floor(Math.random() * moves.length)];
        }
        let best = null;
        let bestScore = -1e9;
        for (const m of moves) {
            const saved = cloneBoard();
            const savedTurn = turn;
            const savedCastling = { ...castling };
            const savedEp = ep ? { ...ep } : null;
            const savedCW = [...capturedWhite], savedCB = [...capturedBlack];
            makeMove(m, { simulation: true });
            const score = -minimax(d - 1, -1e9, 1e9, true);
            board = saved;
            turn = savedTurn;
            castling = savedCastling;
            ep = savedEp;
            capturedWhite = savedCW;
            capturedBlack = savedCB;
            if (score > bestScore) {
                bestScore = score;
                best = m;
            }
        }
        return best || moves[0];
    }

    function moveToNotation(m) {
        const p = (m.piece || 'P').toUpperCase();
        const from = String.fromCharCode(97 + m.from.c) + (8 - m.from.r);
        const to = String.fromCharCode(97 + m.to.c) + (8 - m.to.r);
        if (m.flags?.castle === 'k') return 'O-O';
        if (m.flags?.castle === 'q') return 'O-O-O';
        const cap = m.captured ? 'x' : '';
        const piece = p === 'P' ? '' : p;
        return piece + cap + to;
    }

    function render(opts) {
        const hidePieceAt = opts && opts.hidePieceAt;
        const hideSet = Array.isArray(hidePieceAt)
            ? hidePieceAt
            : hidePieceAt ? [hidePieceAt] : [];
        const hide = (r, c) => hideSet.some(h => h.r === r && h.c === c);

        moveWhiteEl.innerHTML = '';
        moveBlackEl.innerHTML = '';
        moveHistory.forEach((m, i) => {
            const container = i % 2 === 0 ? moveWhiteEl : moveBlackEl;
            const item = document.createElement('div');
            item.className = 'move-item';

            const num = i % 2 === 0 ? `<span class="move-num">${(i / 2 + 1)}.</span> ` : '';
            item.innerHTML = num + moveToNotation(m);
            container.appendChild(item);
        });

        // Render Captured Pieces
        capturesWhiteEl.innerHTML = '';
        capturedWhite.forEach(p => {
            const span = document.createElement('span');
            span.textContent = PIECES[p];
            capturesWhiteEl.appendChild(span);
        });
        capturesBlackEl.innerHTML = '';
        capturedBlack.forEach(p => {
            const span = document.createElement('span');
            span.textContent = PIECES[p];
            capturesBlackEl.appendChild(span);
        });

        boardEl.innerHTML = '';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = document.createElement('div');
                sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
                sq.dataset.r = r;
                sq.dataset.c = c;
                sq.setAttribute('role', 'gridcell');
                const p = board[r][c];
                const skipPiece = hide(r, c);
                if (p && !skipPiece) {
                    const span = document.createElement('span');
                    span.textContent = PIECES[p];
                    span.className = 'piece';
                    sq.appendChild(span);
                }
                if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
                    sq.classList.add('last-move');
                }
                if (selected && selected.r === r && selected.c === c) {
                    sq.classList.add('selected');
                }
                const valid = validMoves.find(v => v.to.r === r && v.to.c === c);
                if (valid) {
                    sq.classList.add(board[r][c] ? 'valid-capture' : 'valid-move');
                }

                // Add Coordinates
                if (c === 0) {
                    const label = document.createElement('span');
                    label.className = 'coord rank';
                    label.textContent = 8 - r;
                    sq.appendChild(label);
                }
                if (r === 7) {
                    const label = document.createElement('span');
                    label.className = 'coord file';
                    label.textContent = String.fromCharCode(97 + c);
                    sq.appendChild(label);
                }

                boardEl.appendChild(sq);
            }
        }
    }

    function updateStatus() {
        if (gameOver) return;
        if (isCheckmate()) {
            const winner = turn === 'w' ? 'Black' : 'White';
            statusEl.textContent = `Checkmate! ${winner} wins.`;
            gameOver = true;
            stopTimer();
            return;
        }
        if (isStalemate()) {
            statusEl.textContent = 'Stalemate.';
            gameOver = true;
            stopTimer();
            return;
        }
        // 50 move rule check (simplified)
        if (fullmove > 100) {
            statusEl.textContent = 'Draw by 50-move rule.';
            gameOver = true;
            stopTimer();
            return;
        }

        if (isInCheck(turn)) {
            statusEl.textContent = (turn === 'w' ? 'White' : 'Black') + ' is in check.';
        } else {
            statusEl.textContent = (turn === 'w' ? 'White' : 'Black') + ' to move';
        }
        updateClockFaces(); // Update clocks on status change
    }

    function applyMoveImmediate(m) {
        makeMove(m);
        moveHistory.push(m);
        lastMove = { from: m.from, to: m.to };
        selected = null;
        validMoves = [];
        render();
        updateStatus();
    }

    function applyMove(m) {
        const isCastle = m.flags && (m.flags.castle === 'k' || m.flags.castle === 'q');
        if (isCastle) {
            applyMoveImmediate(m);
            if (mode === 'pvc' && !gameOver && turn === 'b') {
                setTimeout(() => { const ai = aiMove(); if (ai) applyMove(ai); }, 80);
            }
            return;
        }

        if (animating) return;
        animating = true;

        const hidePieceAt = m.captured ? [m.from, m.to] : [m.from];
        render({ hidePieceAt });
        const overlay = document.createElement('div');
        overlay.className = 'piece-overlay';
        const pieceEl = document.createElement('div');
        pieceEl.className = 'anim-piece';
        pieceEl.textContent = PIECES[m.piece];
        pieceEl.style.left = (m.from.c * 12.5) + '%';
        pieceEl.style.top = (m.from.r * 12.5) + '%';
        pieceEl.style.transform = 'scale(1.06)';
        const dc = m.to.c - m.from.c;
        const dr = m.to.r - m.from.r;
        overlay.appendChild(pieceEl);
        boardEl.appendChild(overlay);

        let done = false;
        const fallback = setTimeout(() => {
            if (!done) onDone({ propertyName: 'transform' });
        }, ANIM_DURATION_MS + 80);

        function onDone(e) {
            if (e && e.propertyName && e.propertyName !== 'transform') return;
            if (done) return;
            done = true;
            clearTimeout(fallback);
            pieceEl.removeEventListener('transitionend', onDone);
            overlay.remove();
            animating = false;
            applyMoveImmediate(m);
            if (mode === 'pvc' && !gameOver && turn === 'b') {
                setTimeout(() => { const ai = aiMove(); if (ai) applyMove(ai); }, 80);
            }
        }

        pieceEl.addEventListener('transitionend', onDone);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                pieceEl.style.transform = `translate(${dc * 100}%, ${dr * 100}%) scale(1)`;
            });
        });
    }

    function isPlayerTurn() {
        if (gameOver) return false;
        if (mode === 'local') return true;
        return turn === 'w';
    }

    function onSquareClick(r, c) {
        if (animating || !isPlayerTurn()) return;
        if (!movesAllowed) return; // Block moves if game hasn't started

        const p = board[r][c];
        if (selected) {
            const m = validMoves.find(v => v.to.r === r && v.to.c === c);
            if (m) {
                applyMove(m);
                if (mode === 'pvc' && !gameOver && turn === 'b') {
                    setTimeout(() => {
                        const ai = aiMove();
                        if (ai) applyMove(ai);
                    }, 300);
                }
                return;
            }
            selected = null;
            validMoves = [];
        }
        if (p && ownPiece(p)) {
            selected = { r, c };
            validMoves = legalMoves().filter(m => m.from.r === r && m.from.c === c);
        }
        render();
    }

    function newGame() {
        parseFen(FEN_START); // Use existing parseFen to reset board and state
        lastMove = null;
        selected = null;
        validMoves = [];
        moveHistory = [];
        capturedWhite = [];
        capturedBlack = [];
        gameOver = false;

        resetTimer();
        render();
        updateStatus();

        if (mode === 'pvc') {
            movesAllowed = true;
            btnStart.classList.add('hidden');
            clockContainer.classList.add('hidden');
            stopTimer(); // Stop timer for PVC mode as clocks are hidden
            statusEl.textContent = (turn === 'w' ? 'White' : 'Black') + ' to move';
        } else { // Local 2 Players
            movesAllowed = false; // Wait for start
            btnStart.classList.remove('hidden');
            clockContainer.classList.remove('hidden');
            statusEl.textContent = "Press Start to begin";
        }
    }

    /* --- Timer Logic --- */

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        lastTime = Date.now();
        timerInterval = setInterval(() => {
            if (gameOver) {
                stopTimer();
                return;
            }
            const now = Date.now();
            const delta = now - lastTime;
            lastTime = now;

            if (turn === 'w') {
                timeWhite += delta;
            } else {
                timeBlack += delta;
            }
            updateClockFaces();
        }, 33); // Update approx 30fps
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    }

    function resetTimer() {
        stopTimer();
        timeWhite = 0;
        timeBlack = 0;
        updateClockFaces();
        clockWhiteEl.classList.add('active');
        clockBlackEl.classList.remove('active');
    }

    function formatTime(ms) {
        let minutes = Math.floor(ms / 60000);
        let seconds = Math.floor((ms % 60000) / 1000);
        let centis = Math.floor((ms % 1000) / 10); // Display 2 digits for ms equivalent part

        return `${pad(minutes)}:${pad(seconds)}:${pad(centis)}`;
    }

    function pad(n) {
        return n < 10 ? '0' + n : n;
    }

    function updateClockFaces() {
        clockWhiteEl.querySelector('.clock-time').textContent = formatTime(timeWhite);
        clockBlackEl.querySelector('.clock-time').textContent = formatTime(timeBlack);

        // Highlight active clock
        if (turn === 'w') {
            clockWhiteEl.classList.add('active');
            clockBlackEl.classList.remove('active');
        } else {
            clockWhiteEl.classList.remove('active');
            clockBlackEl.classList.add('active');
        }
    }
    /* ---------------- */

    function bindUi() {
        boardEl.addEventListener('click', (e) => {
            const sq = e.target.closest('.square');
            if (!sq) return;
            const r = parseInt(sq.dataset.r, 10);
            const c = parseInt(sq.dataset.c, 10);
            onSquareClick(r, c);
        });

        btnNew.addEventListener('click', () => {
            newGame();
        });

        btnStart.addEventListener('click', () => {
            movesAllowed = true;
            startTimer();
            btnStart.classList.add('hidden'); // Hide start button after starting
            updateStatus();
        });

        document.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                mode = e.target.value;
                diffRow.classList.toggle('hidden', mode !== 'pvc');
                newGame();
            });
        });

        document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                difficulty = e.target.value;
            });
        });
    }

    diffRow.classList.toggle('hidden', mode !== 'pvc');
    newGame();
    bindUi();

    // Explicitly enforce visibility state on load
    if (mode === 'pvc') {
        clockContainer.classList.add('hidden');
        btnStart.classList.add('hidden');
    }
    // Theme sync with parent (when embedded in iframe)
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme || 'light');
    }
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'theme-change') applyTheme(e.data.theme);
    });
    try {
        const saved = localStorage.getItem('theme');
        if (saved) applyTheme(saved);
    } catch (_) { }
})();
