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

    let equation = '';
    let toastTimer = null;

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

        answerBody.innerHTML = `
            <div class="solution">
                ${data.answer.replace(/\n/g, "<br>")}
            </div>
        `;

    }
    catch (err) {

        answerBody.innerHTML = `
            <div class="final-answer">
                ❌ Unable to connect to AI.
            </div>
        `;

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

   })();    // closes the IIFE