(function() {


    'use strict';

    // ─── Background Canvas Animation ───
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];
    const PARTICLE_COUNT = 60;

    function resizeCanvas() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.1;
            this.hue = Math.random() > 0.5 ? 180 : 260; // cyan or purple
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.hue === 180
                ? `rgba(0, 255, 255, ${this.opacity})`
                : `rgba(124, 58, 237, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    let mouseX = -9999, mouseY = -9999;
    window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    const alpha = (1 - dist / 150) * 0.08;
                    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
            const dmx = particles[i].x - mouseX;
            const dmy = particles[i].y - mouseY;
            const distM = Math.sqrt(dmx * dmx + dmy * dmy);
            if (distM < 200) {
                const alpha = (1 - distM / 200) * 0.15;
                ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouseX, mouseY);
                ctx.stroke();
            }
        }
    }

    function animateBg() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        requestAnimationFrame(animateBg);
    }
    animateBg();

    // ─── DOM Refs ───
    const display = document.getElementById('equationDisplay');
    const calcGrid = document.getElementById('calcGrid');
    const solveBtn = document.getElementById('solveBtn');
    const answerCard = document.getElementById('answerCard');
    const answerBody = document.getElementById('answerBody');
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const fileName = document.getElementById('fileName');
    const fileNameText = document.getElementById('fileNameText');
    const toast = document.getElementById('toast');
    const answerActions = document.getElementById('answerActions');
    const copyBtn = document.getElementById('copyBtn');
    const exportBtn = document.getElementById('exportBtn');

    let equation = '';
    let toastTimer = null;

    // Raw text of the latest AI solution (used by Copy / Export buttons)
    let currentAnswerText = '';

    // ─── Toast ───
    function showToast(msg, icon = 'fa-check-circle') {
        if (toastTimer) { clearTimeout(toastTimer); toast.classList.remove('show'); }
        toast.innerHTML = `<i class="fas ${icon}"></i>${msg}`;
        toast.classList.add('show');
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
            toastTimer = null;
        }, 3000);
    }

    // ─── Display Update ───
    function updateDisplay() {
        display.textContent = equation;
    }

    // ─── Calculator Buttons ───
    calcGrid.addEventListener('click', e => {
        const btn = e.target.closest('.calc-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        const value = btn.dataset.value;

        if (action === 'clear') {
            equation = '';
            updateDisplay();
            return;
        }

        if (action === 'backspace') {
            equation = equation.slice(0, -1);
            updateDisplay();
            return;
        }

        if (value) {
           if (/^[0-9]$/.test(value)) {
               const lastNumber = equation.split(/[^0-9]/).pop();
               if (lastNumber.length >= 10) {
                   showToast("Maximum 10 digits per number");
                   return;

                }

            }

            equation += value;
            updateDisplay();
        }
    });

    // ─── Upload File ───
    uploadArea.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) handleFile(file);
    });

    // ─── Drag & Drop ───
    uploadArea.addEventListener('dragover', e => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', e => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    function handleFile(file) {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            showToast('Please upload a PNG, JPG or JPEG image', 'fa-exclamation-triangle');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('File too large. Maximum 10MB.', 'fa-exclamation-triangle');
            return;
        }
        fileNameText.textContent = file.name;
        uploadArea.classList.add('has-file');
        showToast(`Uploaded: ${file.name}`, 'fa-image');
    }

    // ─── Solve ───
   solveBtn.addEventListener("click", async () => {

    if (!equation.trim()) {
        showToast("Please enter an equation first", "fa-exclamation-triangle");
        return;
    }

    solveBtn.classList.add("loading");
    solveBtn.disabled = true;

    answerCard.classList.add("visible");
    answerBody.innerHTML = `
        <div class="loading">
            🤖 AI is solving...
        </div>
    `;

    answerActions.classList.remove("show");

    try {

        const response = await fetch("https://math-solver-api-7t8w.onrender.com/solve", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                equation
            })

        });

        if (!response.ok) {
            throw new Error("Server Error");
        }

        const data = await response.json();

        // Store the raw AI text, then render it with KaTeX math, code blocks and lists
        currentAnswerText = data.answer;
        renderSolution(data.answer);
        answerActions.classList.add("show");

    }
    catch (err) {

        answerBody.innerHTML = `
            <div class="final-answer">
                ❌ Unable to connect to AI.
            </div>
        `;

        answerActions.classList.remove("show");

        console.error(err);

    }

   finally {

    solveBtn.classList.remove("loading");
    solveBtn.disabled = false;

   }

   });   // <-- THIS closes solveBtn.addEventListener()

   // ─── Keyboard shortcuts ───
   document.addEventListener('keydown', e => {
       if (e.key === "Enter" && !solveBtn.disabled) {
           solveBtn.click();
       }
   });

   // ─── Handle window resize for canvas ───
   window.addEventListener('resize', () => {
       particles.forEach(p => {
           p.x = Math.random() * w;
           p.y = Math.random() * h;
       });
    });  

   // ═══════════════════════════════════════════════════════════════
   // NEW MODULE — Solution renderer (KaTeX), Copy & PDF export
   // Lives inside the main IIFE so it can reuse the existing scope
   // (answerBody, answerActions, copyBtn, exportBtn, toast,
   //  showToast, equation, currentAnswerText).
   // ═══════════════════════════════════════════════════════════════

       // ═══════════════════════════════════════════════════════════════
       // FEATURE 1 — KaTeX mathematical rendering
       // ═══════════════════════════════════════════════════════════════

       // Convert common plain-text math notation into LaTeX for KaTeX.
       function convertToLatex(str) {
           let out = String(str);
           // Superscript characters: 4² -> 4^{2}
           const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
           out = out.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, ch => '^{' + SUP[ch] + '}');
           // Square roots: √(x+1) -> \sqrt{x+1}, √x -> \sqrt{x}
           out = out.replace(/√\(([^)]*)\)/g, '\\sqrt{$1}');
           out = out.replace(/√([a-zA-Z0-9])/g, '\\sqrt{$1}');
           // Greek letters
           const GREEK = { α:'\\alpha', β:'\\beta', γ:'\\gamma', δ:'\\delta', ε:'\\epsilon', θ:'\\theta', λ:'\\lambda', μ:'\\mu', σ:'\\sigma', φ:'\\phi', π:'\\pi', ω:'\\omega', τ:'\\tau', Δ:'\\Delta', Γ:'\\Gamma', Λ:'\\Lambda', Σ:'\\Sigma', Φ:'\\Phi', Ω:'\\Omega', Θ:'\\Theta', Ξ:'\\Xi', Π:'\\Pi', Ψ:'\\Psi' };
           Object.keys(GREEK).forEach(g => { out = out.split(g).join(GREEK[g]); });
           // Operators / relation symbols
           out = out.split('÷').join('\\div');
           out = out.split('×').join('\\times');
           out = out.split('±').join('\\pm');
           out = out.split('≤').join('\\le');
           out = out.split('≥').join('\\ge');
           out = out.split('∞').join('\\infty');
           out = out.split('%').join('\\%');
           return out;
       }

       // Try to render an expression with KaTeX into a container element.
       // Falls back to the original text if KaTeX is missing or fails.
       function renderMathInto(container, expr, displayMode) {
           if (typeof window.katex === 'undefined') {
               container.textContent = expr;
               container.classList.add('math-fallback');
               return false;
           }
           try {
               katex.render(expr, container, { displayMode: displayMode, throwOnError: true });
               return true;
           } catch (err) {
               container.textContent = expr;
               container.classList.add('math-fallback');
               return false;
           }
       }

       // Heuristic: does this line look like a math-only expression?
       function looksLikeMathLine(line) {
           const t = String(line).trim();
           if (!t || t.length > 160) return false;
           if (!/[=+\-*×÷^_√π±≤≥∫Σ∂\\]/.test(t)) return false;
           const words = t.split(/\s+/).filter(Boolean);
           const prose = words.filter(w => !w.includes('\\') && /^[a-zA-Z]{4,}$/.test(w.replace(/[^a-zA-Z]/g, ''))).length;
           return prose === 0;
       }

       // Tokenize inline text into math / bold / italic / code / plain parts.
       function tokenizeInline(text) {
           const RE = /(\$\$[^$]+\$\$|\$[^$\n]+\$|\\\([^\\]+\\\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
           const tokens = [];
           let last = 0, m;
           RE.lastIndex = 0;
           while ((m = RE.exec(text)) !== null) {
               if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });
               const tok = m[0];
               if (tok.startsWith('$$') && tok.endsWith('$$')) tokens.push({ type: 'math', value: tok.slice(2, -2) });
               else if (tok.startsWith('$')) tokens.push({ type: 'math', value: tok.slice(1, -1) });
               else if (tok.startsWith('\\(')) tokens.push({ type: 'math', value: tok.slice(2, -2) });
               else if (tok.startsWith('`')) tokens.push({ type: 'code', value: tok.slice(1, -1) });
               else if (tok.startsWith('**')) tokens.push({ type: 'bold', value: tok.slice(2, -2) });
               else tokens.push({ type: 'em', value: tok.slice(1, -1) });
               last = m.index + tok.length;
           }
           if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
           return tokens;
       }

       // Append inline tokens (text / math / bold / code) into a container.
       function renderInline(container, text) {
           tokenizeInline(text).forEach(tok => {
               if (tok.type === 'text') {
                   container.appendChild(document.createTextNode(tok.value));
               } else if (tok.type === 'bold') {
                   const b = document.createElement('strong');
                   renderInline(b, tok.value);
                   container.appendChild(b);
               } else if (tok.type === 'em') {
                   const em = document.createElement('em');
                   renderInline(em, tok.value);
                   container.appendChild(em);
               } else if (tok.type === 'code') {
                   const c = document.createElement('code');
                   c.className = 'inline-code';
                   c.textContent = tok.value;
                   container.appendChild(c);
               } else if (tok.type === 'math') {
                   const span = document.createElement('span');
                   span.className = 'math-inline';
                   renderMathInto(span, convertToLatex(tok.value), false);
                   container.appendChild(span);
               }
           });
       }

       // Does this line start a special block (fence / math / list / heading)?
       function isBlockStart(line) {
           return /^\s*```/.test(line) || /^\s*\$\$/.test(line) || /^\s*\\\[/.test(line) ||
               /^\s*\\begin\{/.test(line) || /^\s*\**\s*final answer/i.test(line) ||
               /^\s*\**\s*step\s+\d+/i.test(line) || /^\s*#{1,3}\s+/.test(line) ||
               /^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line) ||
               /^\s*\*\*[^*]+\*\*\s*$/.test(line);
       }

       // Split the raw AI response into structured blocks.
       function parseBlocks(text) {
           const lines = String(text).split(/\r?\n/);
           const blocks = [];
           let i = 0;

           while (i < lines.length) {
               let line = lines[i];

               if (!line.trim()) { i++; continue; }

               // Fenced code block ```lang ... ```
               const fence = line.match(/^\s*```([\w+-]*)\s*$/);
               if (fence) {
                   const code = [];
                   i++;
                   while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
                   i++;
                   blocks.push({ type: 'code', lang: fence[1] || 'code', content: code.join('\n') });
                   continue;
               }

               // Block math: $$ ... $$ or \[ ... \]
               if (/^\s*\$\$/.test(line)) {
                   const content = [line.replace(/^\s*\$\$/, '')];
                   i++;
                   while (i < lines.length && !/\$\$\s*$/.test(content[content.length - 1])) { content.push(lines[i]); i++; }
                   const last = content.pop();
                   content.push(last.replace(/\$\$\s*$/, ''));
                   blocks.push({ type: 'math', content: content.join('\n').trim() });
                   continue;
               }
               if (/^\s*\\\[/.test(line)) {
                   const content = [line.replace(/^\s*\\\[/, '')];
                   i++;
                   while (i < lines.length && !/\\\]\s*$/.test(content[content.length - 1])) { content.push(lines[i]); i++; }
                   const last = content.pop();
                   content.push(last.replace(/\\\]\s*$/, ''));
                   blocks.push({ type: 'math', content: content.join('\n').trim() });
                   continue;
               }
               // LaTeX environments: \begin{aligned}, \begin{pmatrix}, \begin{cases} ...
               if (/^\s*\\begin\{/.test(line)) {
                   const content = [];
                   while (i < lines.length && !/\\end\{/.test(lines[i])) { content.push(lines[i]); i++; }
                   if (i < lines.length) { content.push(lines[i]); i++; }
                   blocks.push({ type: 'math', content: content.join('\n') });
                   continue;
               }

               // Final answer (the AI prompt ends with "Final Answer")
               const finalMatch = line.match(/^\s*\**\s*final answer\s*:?\s*\**\s*(.*)$/i);
               if (finalMatch) {
                   const content = [finalMatch[1]];
                   i++;
                   while (i < lines.length && lines[i].trim()) { content.push(lines[i]); i++; }
                   blocks.push({ type: 'final', content: content.filter(l => l.trim()).join('\n').replace(/\*+/g, '') });
                   continue;
               }

               // Step headings: "**Step 1:** ..." or "Step 1. ..."
               const stepMatch = line.match(/^\s*\**\s*(step\s+\d+)\s*[.:)]?\s*\**\s*:?\s*(.*)$/i);
               if (stepMatch) {
                   blocks.push({ type: 'step', label: stepMatch[1], content: stepMatch[2] });
                   i++;
                   continue;
               }

               // Bold-only line => heading
               const boldHead = line.match(/^\s*\*\*([^*]+)\*\*\s*$/);
               if (boldHead) {
                   blocks.push({ type: 'heading', content: boldHead[1] });
                   i++;
                   continue;
               }

               // Markdown headings: # ## ###
               const headMatch = line.match(/^\s*(#{1,3})\s+(.*)$/);
               if (headMatch) {
                   blocks.push({ type: 'heading', content: headMatch[2] });
                   i++;
                   continue;
               }

               // Lists: "- item" / "* item" / "1. item"
               const isOrdered = /^\s*\d+[.)]\s+/.test(line);
               if (/^\s*[-*•]\s+/.test(line) || isOrdered) {
                   const items = [];
                   const re = isOrdered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/;
                   while (i < lines.length && re.test(lines[i])) { items.push(lines[i].replace(re, '')); i++; }
                   blocks.push({ type: 'list', ordered: isOrdered, items });
                   continue;
               }

               // Plain paragraph (consecutive non-special lines)
               const para = [line];
               i++;
               while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { para.push(lines[i]); i++; }
               blocks.push({ type: 'paragraph', content: para.join('\n') });
           }
           return blocks;
       }

       // Build the complete solution DOM inside the answer card.
       function renderSolution(rawText) {
           const blocks = parseBlocks(rawText);
           answerBody.innerHTML = '';

           blocks.forEach(block => {
               const el = document.createElement('div');

               switch (block.type) {

                   case 'code': {
                       el.className = 'code-block';
                       const header = document.createElement('div');
                       header.className = 'code-header';
                       header.innerHTML = `<i class="fas fa-code"></i> ${block.lang}`;
                       const pre = document.createElement('pre');
                       const codeEl = document.createElement('code');
                       codeEl.textContent = block.content;
                       pre.appendChild(codeEl);
                       el.appendChild(header);
                       el.appendChild(pre);
                       break;
                   }

                   case 'math': {
                       el.className = 'math-block';
                       renderMathInto(el, convertToLatex(block.content), true);
                       break;
                   }

                   case 'final': {
                       el.className = 'final-block';
                       const label = document.createElement('div');
                       label.className = 'final-label';
                       label.textContent = 'Final Answer';
                       const contentDiv = document.createElement('div');
                       contentDiv.className = 'final-content';
                       // Always render the final answer in KaTeX math font.
                       // Falls back to inline text only if KaTeX fails.
                       if (!renderMathInto(contentDiv, convertToLatex(block.content), false)) {
                           contentDiv.textContent = '';
                           contentDiv.classList.remove('math-fallback');
                           renderInline(contentDiv, block.content);
                       }
                       el.appendChild(label);
                       el.appendChild(contentDiv);
                       break;
                   }

                   case 'step': {
                       el.className = 'solution-step';
                       const label = document.createElement('div');
                       label.className = 'step-label';
                       label.textContent = block.label;
                       const contentDiv = document.createElement('div');
                       renderInline(contentDiv, block.content);
                       el.appendChild(label);
                       el.appendChild(contentDiv);
                       break;
                   }

                   case 'heading': {
                       el.className = 'solution-heading';
                       renderInline(el, block.content);
                       break;
                   }

                   case 'list': {
                       const list = document.createElement(block.ordered ? 'ol' : 'ul');
                       list.className = 'solution-list';
                       block.items.forEach(item => {
                           const li = document.createElement('li');
                           renderInline(li, item);
                           list.appendChild(li);
                       });
                       el.appendChild(list);
                       break;
                   }

                   case 'paragraph':
                   default: {
                       if (looksLikeMathLine(block.content)) {
                           el.className = 'math-block';
                           renderMathInto(el, convertToLatex(block.content), true);
                       } else {
                           el.className = 'solution-text';
                           renderInline(el, block.content);
                       }
                       break;
                   }
               }

               answerBody.appendChild(el);
           });
       }

       // ═══════════════════════════════════════════════════════════════
       // FEATURE 2 — Copy Solution
       // ═══════════════════════════════════════════════════════════════

       // Remove markdown-ish syntax, keep readable plain text.
       function stripMarkdown(text) {
           return String(text)
               .replace(/`{1,3}/g, '')
               .replace(/\*\*(.*?)\*\*/g, '$1')
               .replace(/\*(.*?)\*/g, '$1')
               .replace(/\$([^$]*)\$/g, '$1')
               .replace(/^#{1,3}\s*/gm, '')
               .trim();
       }

       // Plain-text version of the complete solution (clipboard).
       function buildSolutionText() {
           const problem = equation.trim();
           const lines = [];
           lines.push('AI Math Solver');
           lines.push('──────────────────────────');
           lines.push('Problem: ' + problem);
           lines.push('');
           lines.push(stripMarkdown(currentAnswerText));
           lines.push('');
           lines.push('──────────────────────────');
           lines.push('Generated by AI Math Solver');
           return lines.join('\n');
       }

       // Clipboard helper with fallback for older browsers.
       async function copyToClipboard(text) {
           if (navigator.clipboard && window.isSecureContext) {
               await navigator.clipboard.writeText(text);
           } else {
               const ta = document.createElement('textarea');
               ta.value = text;
               ta.style.position = 'fixed';
               ta.style.opacity = '0';
               document.body.appendChild(ta);
               ta.select();
               document.execCommand('copy');
               ta.remove();
           }
       }

       copyBtn.addEventListener('click', async e => {
           addRipple(copyBtn, e);
           if (!currentAnswerText) {
               showToast('No solution to copy yet', 'fa-exclamation-triangle');
               return;
           }
           const label = copyBtn.querySelector('.action-label');
           try {
               await copyToClipboard(buildSolutionText());
               label.textContent = '✔ Copied!';
               copyBtn.classList.add('copied');
               showToast('Solution copied successfully.', 'fa-check-circle');
               setTimeout(() => {
                   label.textContent = '📋 Copy Solution';
                   copyBtn.classList.remove('copied');
               }, 2000);
           } catch (err) {
               console.error(err);
               showToast('Copy failed. Try again.', 'fa-exclamation-triangle');
           }
       });

       // ═══════════════════════════════════════════════════════════════
       // FEATURE 3 — Export Solution as PDF (jsPDF)
       // ═══════════════════════════════════════════════════════════════

       // Replace math symbols with ASCII equivalents (jsPDF default fonts).
       function normalizeForPdf(text) {
           return stripMarkdown(text)
               .replace(/π/g, 'pi')
               .replace(/√\(/g, 'sqrt(')
               .replace(/√/g, 'sqrt ')
               .replace(/²/g, '^2').replace(/³/g, '^3')
               .replace(/÷/g, ' / ').replace(/×/g, ' x ')
               .replace(/≤/g, '<=').replace(/≥/g, '>=')
               .replace(/±/g, '+/-').replace(/−/g, '-')
               .replace(/∞/g, 'infinity')
               .replace(/α/g, 'alpha').replace(/β/g, 'beta').replace(/γ/g, 'gamma')
               .replace(/δ/g, 'delta').replace(/θ/g, 'theta').replace(/λ/g, 'lambda')
               .replace(/μ/g, 'mu').replace(/σ/g, 'sigma').replace(/φ/g, 'phi')
               .replace(/ω/g, 'omega').replace(/Δ/g, 'Delta').replace(/Σ/g, 'Sigma')
               .replace(/Ω/g, 'Omega');
       }

       // Filename timestamp: Math_Solution_YYYY-MM-DD_HH-MM
       function pdfTimestamp() {
           const d = new Date();
           const p = n => String(n).padStart(2, '0');
           return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
       }

       exportBtn.addEventListener('click', e => {
           addRipple(exportBtn, e);
           if (!currentAnswerText) {
               showToast('No solution to export yet', 'fa-exclamation-triangle');
               return;
           }
           if (typeof window.jspdf === 'undefined') {
               showToast('PDF library failed to load.', 'fa-exclamation-triangle');
               return;
           }
           try {
               exportPdf();
               showToast('PDF downloaded successfully.', 'fa-file-pdf');
           } catch (err) {
               console.error(err);
               showToast('PDF export failed.', 'fa-exclamation-triangle');
           }
       });

       function exportPdf() {
           const { jsPDF } = window.jspdf;
           const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

           const MARGIN = 16;                 // page margins (mm)
           const CONTENT_W = 210 - MARGIN * 2; // usable width
           const PAGE_BREAK = 272;             // y position where we start a new page
           let y = MARGIN;

           const CYAN = [0, 200, 210];
           const PURPLE = [124, 58, 237];

           // ── Header: title + date & time ──
           doc.setFont('helvetica', 'bold');
           doc.setFontSize(22);
           doc.setTextColor(CYAN[0], CYAN[1], CYAN[2]);
           doc.text('AI Math Solver', MARGIN, y);
           y += 7;
           doc.setFont('helvetica', 'normal');
           doc.setFontSize(10);
           doc.setTextColor(110);
           doc.text('Generated: ' + new Date().toLocaleString(), MARGIN, y);
           y += 6;
           doc.setDrawColor(CYAN[0], CYAN[1], CYAN[2]);
           doc.setLineWidth(0.4);
           doc.line(MARGIN, y, 210 - MARGIN, y);
           y += 10;

           // ── Problem ──
           const problem = equation.trim();
           doc.setFont('helvetica', 'bold');
           doc.setFontSize(13);
           doc.setTextColor(PURPLE[0], PURPLE[1], PURPLE[2]);
           doc.text('Problem', MARGIN, y);
           y += 2;
           doc.setFont('helvetica', 'normal');
           doc.setFontSize(11);
           doc.setTextColor(25);
           const problemLines = doc.splitTextToSize('  ' + normalizeForPdf(problem), CONTENT_W);
           y += 5;
           if (y + problemLines.length * 5.5 > PAGE_BREAK) { doc.addPage(); y = MARGIN + 10; }
           doc.text(problemLines, MARGIN, y);
           y += problemLines.length * 5.5 + 10;

           // ── Step-by-step solution ──
           doc.setFont('helvetica', 'bold');
           doc.setFontSize(13);
           doc.setTextColor(PURPLE[0], PURPLE[1], PURPLE[2]);
           doc.text('Step-by-Step Solution', MARGIN, y);
           y += 7;
           doc.setFont('helvetica', 'normal');
           doc.setFontSize(11);
           doc.setTextColor(25);

           const solutionLines = doc.splitTextToSize(normalizeForPdf(currentAnswerText), CONTENT_W);
           solutionLines.forEach(ln => {
               if (y > PAGE_BREAK) { doc.addPage(); y = MARGIN + 5; }
               doc.text(ln, MARGIN, y);
               y += 5.5;
           });
           y += 10;

           // ── Footer credit ──
           if (y > PAGE_BREAK) { doc.addPage(); y = MARGIN + 5; }
           doc.setFont('helvetica', 'italic');
           doc.setFontSize(10);
           doc.setTextColor(120);
           doc.text('Generated by AI Math Solver', MARGIN, y);

           // ── Page numbers on every page ──
           const pages = doc.getNumberOfPages();
           for (let p = 1; p <= pages; p++) {
               doc.setPage(p);
               doc.setFont('helvetica', 'normal');
               doc.setFontSize(9);
               doc.setTextColor(130);
               doc.text('Page ' + p + ' of ' + pages, 210 - MARGIN, 292, { align: 'right' });
           }

           // ── Auto-download ──
           doc.save('Math_Solution_' + pdfTimestamp() + '.pdf');
       }

       // ═══════════════════════════════════════════════════════════════
       // Shared helpers — ripple effect
       // ═══════════════════════════════════════════════════════════════

       // Ripple effect for futuristic action buttons.
       function addRipple(btn, e) {
           const rect = btn.getBoundingClientRect();
           const size = Math.max(rect.width, rect.height);
           const span = document.createElement('span');
           span.className = 'ripple';
           span.style.width = span.style.height = size + 'px';
           span.style.left = (e.clientX - rect.left - size / 2) + 'px';
           span.style.top = (e.clientY - rect.top - size / 2) + 'px';
           btn.appendChild(span);
           span.addEventListener('animationend', () => span.remove());
       }

   })();    // closes the IIFE