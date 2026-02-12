        const REVISION_SCHEDULE = [
            { mode: 'mcq',  waitDays: 1 }, 
            { mode: 'mcq',  waitDays: 0 }, 
            { mode: 'fill', waitDays: 1 }, 
            { mode: 'mcq',  waitDays: 1 }, 
            { mode: 'mcq',  waitDays: 0 }, 
            { mode: 'fill', waitDays: 1 }, 
            { mode: 'mcq',  waitDays: 3 }, 
            { mode: 'mcq',  waitDays: 0 }, 
            { mode: 'fill', waitDays: 3 }, 
            { mode: 'mcq',  waitDays: 0 }, 
            { mode: 'fill', waitDays: 0 }  
        ];
        
        const EXAM_Total_Q = 120;
        const EXAM_TIME_PER_Q = 20;
        const MIN_QUESTIONS_FOR_MOCK = 120;
        const QUESTIONS_PER_SET = 20;

        const Store = {
            data: { subjects: [] },
            load() { const s = localStorage.getItem('quizApp_v29'); if(s) this.data = JSON.parse(s); },
            save() { localStorage.setItem('quizApp_v29', JSON.stringify(this.data)); app.renderDashboard(); },

            addSubject(name) { this.data.subjects.push({ id: Date.now(), name, topics: [], isOpen: false, timeLimitSeconds: 0 }); this.save(); },
            addTopic(subId, name) { this.data.subjects.find(s => s.id === subId).topics.push({ id: Date.now(), name, subtopics: [], isOpen: false }); this.save(); },
            // Added videoWatched to Subtopic
            addSubtopic(subId, topId, name) { this.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId).subtopics.push({ id: Date.now(), name, sets: [], isOpen: false, videoWatched: false }); this.save(); },

            toggleUI(ids) {
                const sub = this.data.subjects.find(s => s.id === ids.subId);
                if(!ids.topId) sub.isOpen = !sub.isOpen;
                else if(!ids.subtopId) sub.topics.find(t => t.id === ids.topId).isOpen = !sub.topics.find(t => t.id === ids.topId).isOpen;
                else sub.topics.find(t => t.id === ids.topId).subtopics.find(st => st.id === ids.subtopId).isOpen = !sub.topics.find(t => t.id === ids.topId).subtopics.find(st => st.id === ids.subtopId).isOpen;
                this.save();
            },

            // New function to toggle video status for SUBTOPIC
            toggleVideoStatus(subId, topId, subtopId) {
                const st = this.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId).subtopics.find(x => x.id === subtopId);
                st.videoWatched = !st.videoWatched;
                this.save();
            },

            deleteItem(type, ids) {
                if(!confirm("Delete?")) return;
                const {subId, topId, subtopId, setIndex} = ids;
                const sub = this.data.subjects.find(s => s.id === subId);
                if(type === 'subject') this.data.subjects = this.data.subjects.filter(s => s.id !== subId);
                else if(type === 'topic') sub.topics.splice(sub.topics.findIndex(t => t.id === topId), 1);
                else if(type === 'subtopic') sub.topics.find(t => t.id === topId).subtopics.splice(sub.topics.find(t => t.id === topId).subtopics.findIndex(st => st.id === subtopId), 1);
                else if(type === 'set') sub.topics.find(t => t.id === topId).subtopics.find(st => st.id === subtopId).sets.splice(setIndex, 1);
                this.save();
            },

            renameItem(type, ids, n) {
                const {subId, topId, subtopId, setIndex} = ids;
                const s = this.data.subjects.find(x => x.id === subId);
                if(type === 'subject') s.name = n;
                else if(type === 'topic') s.topics.find(x => x.id === topId).name = n;
                else if(type === 'subtopic') s.topics.find(x => x.id === topId).subtopics.find(x => x.id === subtopId).name = n;
                else if(type === 'set') s.topics.find(x => x.id === topId).subtopics.find(x => x.id === subtopId).sets[setIndex].name = n;
                this.save();
            },

            updateSetQuestions(ids, qs) {
                const {subId, topId, subtopId, setIndex} = ids;
                this.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId).subtopics.find(st => st.id === subtopId).sets[setIndex].questions = qs;
                this.save();
            },

            getSet(subId, topId, subtopId, setIndex) {
                return this.data.subjects.find(s => s.id === subId)?.topics.find(t => t.id === topId)?.subtopics.find(st => st.id === subtopId)?.sets[setIndex];
            },

            updateSubjectSettings(subId, settings) {
                const sub = this.data.subjects.find(s => s.id === subId);
                if(sub) { Object.assign(sub, settings); this.save(); }
            },

            getTodayStr() { return new Date().toISOString().split('T')[0]; },
            
            getAvailability(set) {
                if(set.completed) return { locked: false, mode: 'mcq', label: 'Revise', color: 'success' };
                const attempts = set.attempts || 0;
                if (attempts >= REVISION_SCHEDULE.length) return { locked: false, mode: 'mcq', label: 'Revise', color: 'success' };

                const currentRule = REVISION_SCHEDULE[attempts];
                const lastDate = set.lastPracticeDate;

                if (!lastDate) return { locked: false, mode: currentRule.mode, label: this.getBtnLabel(currentRule.mode), color: this.getBtnColor(currentRule.mode) };

                let daysToWait = 0;
                if (attempts > 0) daysToWait = REVISION_SCHEDULE[attempts - 1].waitDays;

                if (daysToWait === 0) return { locked: false, mode: currentRule.mode, label: this.getBtnLabel(currentRule.mode), color: this.getBtnColor(currentRule.mode) };

                const last = new Date(lastDate);
                const unlockDate = new Date(last);
                unlockDate.setDate(last.getDate() + daysToWait);
                
                const today = new Date(this.getTodayStr());

                if (today >= unlockDate) {
                    return { locked: false, mode: currentRule.mode, label: this.getBtnLabel(currentRule.mode), color: this.getBtnColor(currentRule.mode) };
                } else {
                    const diffTime = Math.abs(unlockDate - today);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    return { locked: true, mode: currentRule.mode, label: `Wait ${diffDays}d`, color: 'locked' };
                }
            },
            
            getBtnLabel(mode) { return mode === 'fill' ? 'Start Fill Blanks' : 'Start MCQ'; },
            getBtnColor(mode) { return mode === 'fill' ? 'schedule-fill' : 'schedule-mcq'; },

            getCompletedQuestionsCount() {
                let count = 0;
                this.data.subjects.forEach(s => { s.topics.forEach(t => { t.subtopics.forEach(st => { st.sets.forEach(set => { if(set.completed === true) count += (set.questions?.length || 0); }); }); }); });
                return count;
            },

            getCompletedSets() {
                let completedSets = [];
                this.data.subjects.forEach(s => { s.topics.forEach(t => { t.subtopics.forEach(st => { st.sets.forEach(set => { if(set.completed === true) completedSets.push({...set, subjectName: s.name}); }); }); }); });
                return completedSets;
            }
        };

        const app = {
            state: { mode: 'practice', questions: [], answers: [], grades: [], timer: null, index: 0, path: {}, locked: [], totalTimeLimit: 0, timeRemaining: 0, startTime: null, timeTaken: 0 },
            editor: { qs: [], path: {} },
            pendingDocxText: '',

            init() { Store.load(); this.renderDashboard(); this.setupTimePreview(); },
            
            setupTimePreview() {
                const el = document.getElementById('settings-total-time');
                if(el) el.addEventListener('input', (e) => this.updateTimePreview(parseInt(e.target.value) || 0));
            },
            
            updateTimePreview(seconds) {
                const previewEl = document.getElementById('time-preview');
                if(!previewEl) return;
                if(seconds <= 0) previewEl.innerText = 'No limit';
                else previewEl.innerHTML = `${seconds}s/Q <span class="text-muted fs-6 fw-normal">(~${this.formatTimeVerbose(seconds * 20)} for 20 Qs)</span>`;
            },
            
            formatTimeVerbose(seconds) {
                if(seconds <= 0) return 'No limit';
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = seconds % 60;
                let parts = [];
                if(h > 0) parts.push(`${h}h`);
                if(m > 0) parts.push(`${m}m`);
                if(s > 0) parts.push(`${s}s`);
                return parts.join(' ') || '0s';
            },
            
            showView(id) { 
                document.querySelectorAll('[id^="view-"]').forEach(e => e.classList.add('hidden')); 
                document.getElementById(id).classList.remove('hidden'); 
                if(id === 'view-subject-settings') {
                    const input = document.getElementById('settings-total-time');
                    input.oninput = (e) => this.updateTimePreview(parseInt(e.target.value) || 0);
                }
            },
            showDashboard() { this.renderDashboard(); this.showView('view-dashboard'); },
            showAddSubjectModal() { const n = prompt("Subject Name:"); if(n) Store.addSubject(n); },

            openSubjectSettings(subId) {
                const sub = Store.data.subjects.find(s => s.id === subId);
                document.getElementById('settings-subject-name').innerText = sub.name;
                document.getElementById('settings-subject-id').value = subId;
                const timeValue = sub.timeLimitSeconds || 0;
                document.getElementById('settings-total-time').value = timeValue;
                this.showView('view-subject-settings');
                this.updateTimePreview(timeValue);
            },

            saveSubjectSettings() {
                const subId = parseInt(document.getElementById('settings-subject-id').value);
                const totalTimeSeconds = parseInt(document.getElementById('settings-total-time').value) || 0;
                const validTime = Math.max(0, Math.min(36000, totalTimeSeconds)); 
                Store.updateSubjectSettings(subId, { timeLimitSeconds: validTime });
                alert(`✅ Master settings saved! Timer set to ${validTime}s per question.`);
                this.showDashboard();
            },

            setupImportBtn(subId, topId, subtopId, name) {
                const safeName = name.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                return `onclick="app.openImporter(this)" data-ids='${JSON.stringify({subId, topId, subtopId})}' data-name="${safeName}" title="Import into Subtopic"`;
            },
            setupTopicImportBtn(subId, topId, name) {
                 const safeName = name.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                 return `onclick="app.openImporter(this)" data-ids='${JSON.stringify({subId, topId})}' data-name="${safeName}" title="Create New Subtopic from File"`;
            },
            openImporter(btn) {
                const ids = JSON.parse(btn.getAttribute('data-ids'));
                const name = btn.getAttribute('data-name');
                const isNewSubtopic = !ids.subtopId;
                document.getElementById('import-target-display').innerText = isNewSubtopic ? name + " (New Subtopics)" : name;
                document.getElementById('import-target-id').value = JSON.stringify(ids);
                document.getElementById('docx-input').value = '';
                document.getElementById('import-text').value = '';
                document.getElementById('import-preview-container').classList.add('hidden');
                this.showView('view-importer');
            },
            cleanText(str) {
                if(!str) return "";
                return str.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^>\s*/gm, "").replace(/\[([^\]]*)\]/g, "$1").replace(/#{1,6}\s*/g, "").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
            },
            convertDocxToText(html) {
                let text = html.replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n\n').replace(/<\/h[1-6]>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<[^>]*>/g, '');
                text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'").replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"').replace(/&ndash;/g, '-').replace(/&mdash;/g, '-');
                return text.replace(/\n{3,}/g, '\n\n').split('\n').map(l => l.trim()).join('\n').trim();
            },
            parseQuestionsFromText(rawText) {
                const questions = [];
                rawText = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#{1,6}\s*.*$/gm, '').replace(/^Topic\s*\d+[:\.].*$/gmi, '').replace(/^>\s*/gm, '');
                const regex = /\n(?:Q\s*)?(\d+)[\.\)]\s+/gi;
                let matches = [], match;
                const tempText = '\n' + rawText;
                while((match = regex.exec(tempText)) !== null) matches.push({ index: match.index, number: parseInt(match[1]) });
                if(matches.length === 0) return [];
                for(let i = 0; i < matches.length; i++) {
                    const block = tempText.substring(matches[i].index, i < matches.length - 1 ? matches[i + 1].index : tempText.length);
                    const parsed = this.parseQuestionBlock(block);
                    if(parsed) questions.push(parsed);
                }
                return questions;
            },
            parseQuestionBlock(block) {
                try {
                    block = block.trim();
                    const lines = block.split('\n').map(l => l.trim()).filter(l => l);
                    if(lines.length < 3) return null;
                    let questionText = '', optionStartIndex = -1;
                    const firstLineMatch = lines[0].match(/^(?:Q\s*)?(\d+)[\.\)]\s*(.*)$/i);
                    if(firstLineMatch) questionText = firstLineMatch[2];
                    for(let i = 1; i < lines.length; i++) { if(/^[A-D][\.\)]\s/i.test(lines[i])) { optionStartIndex = i; break; } questionText += ' ' + lines[i]; }
                    questionText = this.cleanText(questionText);
                    const options = ['', '', '', ''], optionLabels = ['A', 'B', 'C', 'D'];
                    let currentOption = -1, correctAnswer = 0, note = '', inNote = false;
                    for(let i = optionStartIndex; i < lines.length; i++) {
                        const line = lines[i];
                        const optMatch = line.match(/^([A-D])[\.\)]\s*(.*)$/i);
                        if(optMatch) { const idx = optionLabels.indexOf(optMatch[1].toUpperCase()); if(idx !== -1) { currentOption = idx; options[idx] = this.cleanText(optMatch[2]); inNote = false; continue; } }
                        const ansMatch = line.match(/^(?:Correct\s+)?Answer[:\s]+([A-D])(?:[\)\]]|\s|$)/i);
                        if(ansMatch) { correctAnswer = optionLabels.indexOf(ansMatch[1].toUpperCase()); if(correctAnswer === -1) correctAnswer = 0; inNote = false; continue; }
                        const noteMatch = line.match(/^(?:Note|Explanation)[:\s]+(.*)$/i);
                        if(noteMatch) { note = this.cleanText(noteMatch[1]); inNote = true; continue; }
                        if(inNote && line && !line.match(/^[A-D][\.\)]/i) && !line.match(/^(?:Q\s*)?\d+[\.\)]/i)) { note += ' ' + this.cleanText(line); continue; }
                        if(currentOption !== -1 && !line.match(/^(?:Correct\s+)?Answer/i) && !line.match(/^(?:Note|Explanation)/i)) options[currentOption] += ' ' + this.cleanText(line);
                    }
                    for(let i = 0; i < options.length; i++) options[i] = options[i].trim();
                    return { q: questionText, opts: options, ans: correctAnswer, note: note.trim() };
                } catch(e) { return null; }
            },
            async previewDocx() {
                const input = document.getElementById('docx-input');
                if(input.files.length === 0) { alert("Select files first."); return; }
                let allText = '';
                for(let i = 0; i < input.files.length; i++) {
                    const ab = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsArrayBuffer(input.files[i]); });
                    const res = await mammoth.convertToHtml({ arrayBuffer: ab });
                    allText += '\n\n' + this.convertDocxToText(res.value);
                }
                this.pendingDocxText = allText;
                this.showPreview(this.parseQuestionsFromText(allText));
            },
            previewImport() {
                const txt = document.getElementById('import-text').value;
                if(!txt.trim()) { alert("Paste questions first."); return; }
                this.showPreview(this.parseQuestionsFromText(txt));
            },
            showPreview(questions) {
                const container = document.getElementById('import-preview');
                document.getElementById('import-preview-container').classList.remove('hidden');
                container.innerHTML = '';
                if(questions.length === 0) { container.innerHTML = '<div class="text-danger">No valid questions found.</div>'; return; }
                document.getElementById('preview-stats').innerText = `${questions.length} questions`;
                questions.forEach((q, i) => {
                    let html = `<div class="preview-question"><div class="d-flex justify-content-between mb-1"><strong>Q${i + 1}</strong></div><div class="mb-2">${q.q}</div><div class="small">`;
                    q.opts.forEach((o, idx) => { html += `<div class="${idx === q.ans ? 'text-success fw-bold' : ''}">${String.fromCharCode(65+idx)}) ${o}${idx === q.ans ? ' ✓' : ''}</div>`; });
                    html += `</div></div>`;
                    container.innerHTML += html;
                });
            },
            splitIntoSets(questions, existingCount) {
                const sets = [];
                let counter = existingCount + 1;
                for(let i = 0; i < questions.length; i += QUESTIONS_PER_SET) {
                    sets.push({ name: `Set ${counter++}`, questions: questions.slice(i, i + QUESTIONS_PER_SET), completed: false, attempts: 0, lastPracticeDate: null });
                }
                return sets;
            },
            async processDocxSets() {
                const input = document.getElementById('docx-input');
                if(input.files.length === 0) { alert("Select files."); return; }
                const ids = JSON.parse(document.getElementById('import-target-id').value);
                
                if (!ids.subtopId) { 
                    let importedCount = 0;
                    const topic = Store.data.subjects.find(s => s.id === ids.subId).topics.find(t => t.id === ids.topId);
                    for(let i = 0; i < input.files.length; i++) {
                        const file = input.files[i];
                        const subtopicName = file.name.replace(/\.docx$/i, "");
                        const ab = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsArrayBuffer(file); });
                        const html = await mammoth.convertToHtml({ arrayBuffer: ab });
                        const questions = this.parseQuestionsFromText(this.convertDocxToText(html.value));
                        if (questions.length > 0) {
                            topic.subtopics.push({ id: Date.now() + i, name: subtopicName, sets: this.splitIntoSets(questions, 0), isOpen: false, videoWatched: false });
                            importedCount++;
                        }
                    }
                    Store.save(); alert(`✅ Processed ${importedCount} files.`);
                } else {
                    let allText = this.pendingDocxText || '';
                    if(!allText) {
                        for(let i = 0; i < input.files.length; i++) {
                            const ab = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsArrayBuffer(input.files[i]); });
                            allText += '\n\n' + this.convertDocxToText((await mammoth.convertToHtml({ arrayBuffer: ab })).value);
                        }
                    }
                    const questions = this.parseQuestionsFromText(allText);
                    if(questions.length === 0) { alert("No valid questions."); return; }
                    const subtop = Store.data.subjects.find(s => s.id === ids.subId).topics.find(t => t.id === ids.topId).subtopics.find(st => st.id === ids.subtopId);
                    subtop.sets = subtop.sets.concat(this.splitIntoSets(questions, subtop.sets.length));
                    Store.save();
                    alert(`✅ Imported ${questions.length} questions`);
                }
                this.showDashboard();
            },
            processTextImport() {
                const txt = document.getElementById('import-text').value;
                const questions = this.parseQuestionsFromText(txt);
                if(questions.length === 0) { alert("No valid questions."); return; }
                const ids = JSON.parse(document.getElementById('import-target-id').value);
                if (!ids.subtopId) {
                    const name = prompt("Name for new Subtopic:"); if(!name) return;
                    Store.data.subjects.find(s => s.id === ids.subId).topics.find(t => t.id === ids.topId).subtopics.push({ id: Date.now(), name: name, sets: this.splitIntoSets(questions, 0), isOpen: false, videoWatched: false });
                } else {
                    const subtop = Store.data.subjects.find(s => s.id === ids.subId).topics.find(t => t.id === ids.topId).subtopics.find(st => st.id === ids.subtopId);
                    subtop.sets = subtop.sets.concat(this.splitIntoSets(questions, subtop.sets.length));
                }
                Store.save(); alert(`✅ Imported ${questions.length} questions`); this.showDashboard();
            },

            quitQuiz() {
                if(confirm("Exit? Progress will be lost.")) {
                    if(this.state.timer) clearInterval(this.state.timer);
                    this.showDashboard();
                }
            },
            formatTime(seconds) {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                return `${m}:${s.toString().padStart(2, '0')}`;
            },

            prepMockExam() {
                const completedQCount = Store.getCompletedQuestionsCount();
                if(completedQCount < MIN_QUESTIONS_FOR_MOCK) {
                    alert(`🔒 Mock Exam Locked! Need ${MIN_QUESTIONS_FOR_MOCK} questions. Have ${completedQCount}.`);
                    return;
                }
                let pool = [];
                Store.getCompletedSets().forEach(set => set.questions.forEach(q => pool.push({...q, subject: set.subjectName})));
                this.state.questions = this.shuffle(pool).slice(0, EXAM_Total_Q);
                this.state.mode = 'exam';
                this.state.locked = new Array(this.state.questions.length).fill(false);
                this.state.totalTimeLimit = EXAM_Total_Q * EXAM_TIME_PER_Q; 
                this.startQuizSession();
            },

            startSet(subId, topId, subtopId, setIndex, mode) {
                const sub = Store.data.subjects.find(s => s.id === subId);
                const subtopic = sub.topics.find(t => t.id === topId).subtopics.find(st => st.id === subtopId);
                
                // CHECK VIDEO STATUS FIRST (SUBTOPIC LEVEL)
                if (subtopic.videoWatched !== true) {
                    alert("⚠️ You must watch the video for this subtopic before starting the test!");
                    return;
                }

                const set = subtopic.sets[setIndex];
                
                const availability = Store.getAvailability(set);
                if (availability.locked) { alert(`🔒 Set is locked. ${availability.label}`); return; }

                this.state.mode = (mode === 'fill' ? 'fill-blanks' : 'practice');
                this.state.path = { subId, topId, subtopId, setIndex };
                
                this.state.questions = [...set.questions].map(q => ({ ...q, subject: sub.name }));
                
                this.state.locked = [];
                
                const timePerQ = sub.timeLimitSeconds || 0;
                this.state.totalTimeLimit = timePerQ > 0 ? (timePerQ * this.state.questions.length) : 0;

                this.startQuizSession();
            },

            startQuizSession() {
                this.state.answers = this.state.mode === 'fill-blanks' 
                    ? new Array(this.state.questions.length).fill('') 
                    : new Array(this.state.questions.length).fill(null);
                
                this.state.grades = [];
                this.state.index = 0;
                this.state.startTime = Date.now();
                this.state.timeTaken = 0;
                this.state.timeRemaining = this.state.totalTimeLimit;

                document.body.className = this.state.mode + '-mode';
                const titleMap = { 'exam': 'Mock Exam', 'practice': 'Practice (MCQ)', 'fill-blanks': 'Fill in Blanks' };
                document.getElementById('quiz-header-title').innerText = titleMap[this.state.mode];
                
                document.getElementById('palette-card').classList.toggle('hidden', this.state.mode !== 'exam');
                document.getElementById('btn-skip').classList.toggle('hidden', this.state.mode !== 'exam');
                document.getElementById('btn-prev').classList.toggle('hidden', this.state.mode === 'exam');

                const timerContainer = document.getElementById('timer-container');
                if(this.state.timer) clearInterval(this.state.timer);
                
                if(this.state.totalTimeLimit > 0) {
                    timerContainer.classList.remove('hidden');
                    document.getElementById('quiz-timer-text').innerText = this.formatTime(this.state.timeRemaining);
                    this.state.timer = setInterval(() => {
                        this.state.timeRemaining--;
                        this.state.timeTaken = Math.floor((Date.now() - this.state.startTime) / 1000);
                        document.getElementById('quiz-timer-text').innerText = this.formatTime(this.state.timeRemaining);
                        
                        timerContainer.classList.remove('warning', 'danger');
                        if(this.state.timeRemaining <= 60) timerContainer.classList.add('danger');
                        else if(this.state.timeRemaining <= 120) timerContainer.classList.add('warning');

                        if(this.state.timeRemaining <= 0) {
                            clearInterval(this.state.timer);
                            alert("⏰ Time's up!");
                            this.submitQuiz();
                        }
                    }, 1000);
                } else {
                    timerContainer.classList.add('hidden');
                    this.state.timer = setInterval(() => { this.state.timeTaken = Math.floor((Date.now() - this.state.startTime) / 1000); }, 1000);
                }

                this.showView('view-quiz-active');
                this.renderQuestion();
                this.renderPalette();
            },

            renderQuestion() {
                const idx = this.state.index;
                const q = this.state.questions[idx];
                const ans = this.state.answers[idx];
                
                const qNumBadge = document.getElementById('quiz-q-num');
                if(qNumBadge) qNumBadge.classList.add('hidden');
                
                document.getElementById('quiz-subject-tag').innerText = q.subject;
                document.getElementById('quiz-question-text').innerText = q.q;

                const optCont = document.getElementById('quiz-options');
                const inpCont = document.getElementById('quiz-input-container');
                const noteCont = document.getElementById('quiz-note-container');

                noteCont.classList.add('hidden');

                if (this.state.mode === 'fill-blanks') {
                    optCont.classList.add('hidden');
                    inpCont.classList.remove('hidden');
                    const txtInput = document.getElementById('quiz-text-input');
                    txtInput.value = ans || '';
                    txtInput.focus();
                } else {
                    inpCont.classList.add('hidden');
                    optCont.classList.remove('hidden');
                    optCont.innerHTML = '';
                    
                    if(this.state.mode === 'practice' && ans !== null && q.note) {
                        noteCont.classList.remove('hidden');
                        document.getElementById('quiz-note-text').innerText = q.note;
                    }

                    q.opts.forEach((opt, i) => {
                        const btn = document.createElement('button');
                        btn.className = 'btn option-card';
                        if(this.state.mode === 'practice' && ans !== null) {
                            btn.disabled = true;
                            if(i === q.ans) btn.classList.add('correct');
                            else if(i === ans && ans >= 0) btn.classList.add('wrong');
                        } else if(this.state.mode === 'exam') {
                            const isLocked = this.state.locked[idx];
                            if(isLocked) { btn.disabled = true; if(ans === i) btn.classList.add('selected'); }
                            else if(ans === i) btn.classList.add('selected');
                        }
                        btn.innerHTML = `<strong>${String.fromCharCode(65 + i)})</strong> ${opt || '<em class="text-muted">Empty</em>'}`;
                        btn.onclick = () => this.recordAnswer(i);
                        optCont.appendChild(btn);
                    });
                }

                const isLast = idx === this.state.questions.length - 1;
                document.getElementById('btn-next').classList.toggle('hidden', isLast);
                document.getElementById('btn-submit').classList.toggle('hidden', !isLast);
                
                this.renderPalette();
            },

            recordAnswer(i) {
                const idx = this.state.index;
                if(this.state.mode === 'practice' && this.state.answers[idx] !== null) return;
                if(this.state.mode === 'exam' && this.state.locked[idx]) return;
                
                this.state.answers[idx] = i;
                
                if(this.state.mode === 'exam') {
                    this.state.locked[idx] = true;
                    setTimeout(() => {
                        if(idx < this.state.questions.length - 1) { this.state.index++; this.renderQuestion(); this.renderPalette(); }
                        else this.submitQuiz();
                    }, 300);
                } else {
                    this.renderQuestion();
                }
            },

            recordTextAnswer(val) {
                this.state.answers[this.state.index] = val;
            },

            nextQuestion() {
                if(this.state.index < this.state.questions.length - 1) { this.state.index++; this.renderQuestion(); }
            },

            prevQuestion() {
                if(this.state.index > 0) { this.state.index--; this.renderQuestion(); }
            },
            
            skipQuestion() {
                if(this.state.mode === 'exam') {
                    this.state.answers[this.state.index] = -2;
                    this.state.locked[this.state.index] = true;
                    this.nextQuestion();
                }
            },

            renderPalette() {
                if(this.state.mode !== 'exam') return;
                const g = document.getElementById('q-palette-grid');
                g.innerHTML = '';
                this.state.answers.forEach((a, i) => {
                    const d = document.createElement('div');
                    d.className = 'q-dot';
                    d.innerText = i + 1;
                    if(i === this.state.index) d.classList.add('active');
                    if(this.state.locked[i]) {
                        if(a !== null && a >= 0) d.classList.add('answered');
                        else if(a === -2) d.classList.add('skipped');
                        else d.classList.add('locked');
                    }
                    g.appendChild(d);
                });
            },

            submitQuiz(manualScore = null) {
                if(this.state.timer) clearInterval(this.state.timer);
                this.state.timeTaken = Math.floor((Date.now() - this.state.startTime) / 1000);

                if(this.state.mode === 'fill-blanks' && manualScore === null) {
                    this.renderGradingView();
                    return;
                }

                let c = 0, w = 0;
                
                if (manualScore) {
                    c = manualScore.correct;
                    w = manualScore.wrong;
                } else {
                    this.state.questions.forEach((q, i) => {
                        const a = this.state.answers[i];
                        if(a !== null && a >= 0) { if(a === q.ans) c++; else w++; }
                    });
                }

                const netMarks = (c * 1) - (w * 0.33);
                const isPerfect = c === this.state.questions.length;
                let revisionMessage = "";

                if(this.state.mode !== 'exam') {
                    const { subId, topId, subtopId, setIndex } = this.state.path;
                    const set = Store.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId).subtopics.find(st => st.id === subtopId).sets[setIndex];
                    
                    if(isPerfect) {
                        set.lastPracticeDate = Store.getTodayStr();
                        set.attempts = (set.attempts || 0) + 1;
                        if(set.attempts >= REVISION_SCHEDULE.length && !set.completed) {
                            set.completed = true;
                            revisionMessage = `<div class="alert alert-success">🎉 Set fully mastered! Schedule complete.</div>`;
                        } else {
                            revisionMessage = `<div class="alert alert-info">✅ Progress Saved! Step ${set.attempts}/${REVISION_SCHEDULE.length} complete.</div>`;
                        }
                    } else {
                        revisionMessage = `<div class="alert alert-warning">Score: ${c}/${this.state.questions.length}. Get 100% to advance to next step.</div>`;
                    }
                    Store.save();
                }

                document.getElementById('practice-actions').classList.toggle('hidden', this.state.mode === 'exam');
                document.getElementById('res-correct').innerText = c;
                document.getElementById('res-wrong').innerText = w;
                document.getElementById('res-total').innerText = netMarks.toFixed(2);
                document.getElementById('revision-status').innerHTML = revisionMessage;
                
                const avg = this.state.questions.length ? (this.state.timeTaken / this.state.questions.length).toFixed(1) : 0;
                document.getElementById('res-time-taken').innerText = this.formatTime(this.state.timeTaken);
                document.getElementById('res-avg-time').innerText = `${avg}s`;

                const d = document.getElementById('result-details');
                d.innerHTML = '';
                
                this.state.questions.forEach((q, i) => {
                    let statusClass, statusLabel, htmlBody;
                    
                    if(this.state.mode === 'fill-blanks') {
                        const uStr = this.state.answers[i];
                        const isC = this.state.grades[i] === true;
                        statusClass = isC ? 'border-success' : 'border-danger';
                        statusLabel = isC ? '<span class="badge bg-success">Correct</span>' : '<span class="badge bg-danger">Wrong</span>';
                        htmlBody = `<div class="d-flex flex-column gap-2"><div class="user-answer-box ${isC ? 'text-success' : 'text-danger'}"><strong>Your Answer:</strong> ${uStr || '<em>(Empty)</em>'}</div><div class="correct-answer-box"><strong>Correct:</strong> ${q.opts[q.ans]}</div></div>`;
                    } else {
                        const u = this.state.answers[i];
                        const isC = u === q.ans;
                        const isUn = u === null || u === -2;
                        statusClass = isC ? 'border-success' : (isUn ? 'border-secondary' : 'border-danger');
                        statusLabel = u === -2 ? '<span class="badge bg-warning">Skipped</span>' : (u === null ? '<span class="badge bg-secondary">Not Attempted</span>' : '');
                        htmlBody = '';
                        q.opts.forEach((o, k) => { htmlBody += `<div class="${k === q.ans ? 'text-success fw-bold' : (k === u && !isUn ? 'text-danger fw-bold' : '')}">${String.fromCharCode(65 + k)}) ${o || '<em>Empty</em>'}</div>`; });
                    }

                    let h = `<div class="card p-3 mb-2 ${statusClass}"><div class="d-flex justify-content-between mb-2"><strong>${i + 1}. ${q.q}</strong>${statusLabel}</div>${htmlBody}`;
                    if(q.note) h += `<div class="small bg-light p-2 mt-2">Note: ${q.note}</div>`;
                    h += '</div>';
                    d.innerHTML += h;
                });
                
                this.showView('view-results');
            },

            renderGradingView() {
                const list = document.getElementById('grading-list');
                list.innerHTML = '';
                this.state.grades = new Array(this.state.questions.length).fill(null);
                document.getElementById('total-grading-count').innerText = this.state.questions.length;
                this.updateGradingUI();

                this.state.questions.forEach((q, i) => {
                    const card = document.createElement('div');
                    card.className = 'card p-4 mb-3 grading-card';
                    card.id = `grading-card-${i}`;
                    
                    const userVal = this.state.answers[i] || "";
                    const correctVal = q.opts[q.ans];

                    card.innerHTML = `
                        <h6 class="fw-bold mb-3">${i+1}. ${q.q}</h6>
                        <div class="row g-3 mb-3">
                            <div class="col-md-6">
                                <div class="user-answer-box h-100">
                                    <small class="text-uppercase text-muted fw-bold" style="font-size:0.7rem">Your Answer</small>
                                    <div class="mt-1 fw-medium">${userVal || '<em>(No Answer)</em>'}</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="correct-answer-box h-100">
                                    <small class="text-uppercase fw-bold opacity-75" style="font-size:0.7rem">Correct Answer</small>
                                    <div class="mt-1 fw-bold">${correctVal}</div>
                                </div>
                            </div>
                        </div>
                        <div class="d-flex gap-2 justify-content-end">
                            <button class="btn btn-outline-danger" id="btn-grade-wrong-${i}" onclick="app.setGrade(${i}, false)">
                                <span class="material-symbols-rounded align-middle">close</span> Wrong
                            </button>
                            <button class="btn btn-outline-success" id="btn-grade-correct-${i}" onclick="app.setGrade(${i}, true)">
                                <span class="material-symbols-rounded align-middle">check</span> Correct
                            </button>
                        </div>
                    `;
                    list.appendChild(card);
                });
                this.showView('view-grading');
            },

            setGrade(index, isCorrect) {
                this.state.grades[index] = isCorrect;
                
                const card = document.getElementById(`grading-card-${index}`);
                const btnWrong = document.getElementById(`btn-grade-wrong-${index}`);
                const btnCorrect = document.getElementById(`btn-grade-correct-${index}`);

                card.classList.remove('graded-correct', 'graded-wrong');
                card.classList.add(isCorrect ? 'graded-correct' : 'graded-wrong');
                
                btnWrong.className = isCorrect ? 'btn btn-outline-danger' : 'btn btn-danger';
                btnCorrect.className = isCorrect ? 'btn btn-success' : 'btn btn-outline-success';

                this.updateGradingUI();
            },

            updateGradingUI() {
                const gradedCount = this.state.grades.filter(g => g !== null).length;
                document.getElementById('graded-count').innerText = gradedCount;
                document.getElementById('btn-finalize-grading').disabled = gradedCount < this.state.questions.length;
            },

            finalizeGrading() {
                const c = this.state.grades.filter(g => g === true).length;
                const w = this.state.grades.filter(g => g === false).length;
                this.submitQuiz({ correct: c, wrong: w });
            },

            renderDashboard() {
                const c = document.getElementById('subjects-container');
                c.innerHTML = '';
                let gT = 0, gC = 0;
                
                Store.data.subjects.forEach(s => {
                    let sT = 0, sC = 0;
                    s.topics.forEach(t => t.subtopics.forEach(st => { sT += st.sets.length; sC += st.sets.filter(x => x.completed === true).length; }));
                    gT += sT; gC += sC;
                    const op = s.isOpen === true;

                    let h = `<div class="card mb-3 overflow-hidden"><div class="tree-item subject-row" onclick="Store.toggleUI({subId:${s.id}})"><div class="d-flex align-items-center gap-2"><span class="chevron material-symbols-rounded ${op ? 'open' : ''}">chevron_right</span>${s.name}</div><div onclick="event.stopPropagation()"><span class="badge bg-light text-dark border me-2">${sT} Sets</span><button class="icon-btn" onclick="app.openSubjectSettings(${s.id})" title="Master Timer"><span class="material-symbols-rounded">timer</span></button><button class="icon-btn" onclick="app.promptAddTopic(${s.id})"><span class="material-symbols-rounded">add</span></button><button class="icon-btn" onclick="app.promptRename('subject',{subId:${s.id}},'${s.name.replace(/'/g, "\\'")}')"><span class="material-symbols-rounded">edit</span></button><button class="icon-btn delete" onclick="Store.deleteItem('subject',{subId:${s.id}})"><span class="material-symbols-rounded">delete</span></button></div></div><div class="${op ? '' : 'hidden'}">`;

                    s.topics.forEach(t => {
                        const top = t.isOpen === true;
                        
                        h += `<div class="tree-item topic-row" onclick="Store.toggleUI({subId:${s.id},topId:${t.id}})">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="chevron material-symbols-rounded ${top ? 'open' : ''}">chevron_right</span>${t.name}
                                </div>
                                <div class="d-flex align-items-center gap-2" onclick="event.stopPropagation()">
                                    <button class="icon-btn text-primary" ${app.setupTopicImportBtn(s.id, t.id, t.name)}><span class="material-symbols-rounded">post_add</span></button>
                                    <button class="icon-btn" onclick="app.promptAddSubtopic(${s.id},${t.id})"><span class="material-symbols-rounded">add</span></button>
                                    <button class="icon-btn" onclick="app.promptRename('topic',{subId:${s.id},topId:${t.id}},'${t.name.replace(/'/g, "\\'")}')"><span class="material-symbols-rounded">edit</span></button>
                                    <button class="icon-btn delete" onclick="Store.deleteItem('topic',{subId:${s.id},topId:${t.id}})"><span class="material-symbols-rounded">delete</span></button>
                                </div>
                              </div><div class="${top ? '' : 'hidden'}">`;
                        
                        const subtopicsSorted = [...t.subtopics].sort((a, b) => {
                            const attemptsA = a.sets.reduce((acc, s) => acc + (s.attempts || 0), 0);
                            const attemptsB = b.sets.reduce((acc, s) => acc + (s.attempts || 0), 0);
                            return attemptsA - attemptsB;
                        });

                        subtopicsSorted.forEach(st => {
                            const stop = st.isOpen === true;
                            const totalAttempts = st.sets.reduce((acc, s) => acc + (s.attempts || 0), 0);
                            
                            // --- CHECK VIDEO STATUS (SUBTOPIC LEVEL) ---
                            const videoDone = st.videoWatched === true;
                            const videoBtnClass = videoDone ? 'btn-video-done' : 'btn-video-pending';
                            const videoBtnIcon = videoDone ? 'check_circle' : 'play_circle';
                            const videoBtnText = videoDone ? 'Video Watched' : 'Watch Video';

                            h += `<div class="tree-item subtopic-row" onclick="Store.toggleUI({subId:${s.id},topId:${t.id},subtopId:${st.id}})">
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="chevron material-symbols-rounded ${stop ? 'open' : ''}">chevron_right</span>${st.name} <span class="badge bg-light text-muted border" style="font-size:0.6rem">Attended: ${totalAttempts}</span>
                                    </div>
                                    <div class="d-flex align-items-center gap-2" onclick="event.stopPropagation()">
                                        <!-- Video Toggle Button -->
                                        <button class="btn btn-video-status ${videoBtnClass}" onclick="Store.toggleVideoStatus(${s.id},${t.id},${st.id})">
                                            <span class="material-symbols-rounded fs-6">${videoBtnIcon}</span> ${videoBtnText}
                                        </button>
                                        
                                        <div class="vr mx-1"></div>

                                        <button class="icon-btn text-primary" ${app.setupImportBtn(s.id, t.id, st.id, st.name)}><span class="material-symbols-rounded">upload_file</span></button>
                                        <button class="icon-btn" onclick="app.promptRename('subtopic',{subId:${s.id},topId:${t.id},subtopId:${st.id}},'${st.name.replace(/'/g, "\\'")}')"><span class="material-symbols-rounded">edit</span></button>
                                        <button class="icon-btn delete" onclick="Store.deleteItem('subtopic',{subId:${s.id},topId:${t.id},subtopId:${st.id}})"><span class="material-symbols-rounded">delete</span></button>
                                    </div>
                                  </div><div class="set-container ${stop ? '' : 'hidden'}">`;

                            st.sets.forEach((set, idx) => {
                                const attempts = set.attempts || 0;
                                const isCompleted = set.completed === true;
                                const p = Math.min(attempts / REVISION_SCHEDULE.length * 100, 100);
                                
                                let avail = Store.getAvailability(set);
                                const qCount = set.questions?.length || 0;
                                
                                const timePerQ = s.timeLimitSeconds || 0;
                                const timeBadge = timePerQ > 0 ? `<span class="time-badge">${timePerQ}s/Q</span>` : '';

                                // --- OVERRIDE IF VIDEO NOT WATCHED ---
                                if (!videoDone) {
                                    avail = { locked: true, mode: 'locked', label: 'Watch Video First', color: 'locked' };
                                }
                                // ------------------------------------
                                
                                let btnClass = avail.locked ? 'btn-schedule-locked' : `btn-${avail.color}`;
                                let disabledAttr = avail.locked ? 'disabled' : '';

                                h += `<div class="set-item ${isCompleted ? 'completed' : ''}">
                                        <div class="d-flex align-items-center gap-3 flex-grow-1">
                                            <span class="material-symbols-rounded text-${isCompleted ? 'success' : 'secondary'}">${isCompleted ? 'check_circle' : 'description'}</span>
                                            <div>
                                                <div>${set.name} <span class="badge bg-light text-muted border">${qCount} Q</span> ${timeBadge} ${isCompleted ? '<span class="badge bg-success text-white ms-1">Mastered</span>' : ''}</div>
                                                <div class="d-flex align-items-center gap-2 mt-1"><div class="progress-slim"><div class="progress-fill" style="width:${p}%"></div></div><small class="text-muted">${attempts}/${REVISION_SCHEDULE.length}</small></div>
                                            </div>
                                        </div>
                                        <div class="d-flex gap-1">
                                            <button class="btn btn-sm ${btnClass}" style="min-width:110px" onclick="app.startSet(${s.id},${t.id},${st.id},${idx}, '${avail.mode}')" ${disabledAttr}>${avail.label}</button>
                                            <button class="icon-btn" onclick="app.openSetEditor(${s.id},${t.id},${st.id},${idx})"><span class="material-symbols-rounded">edit_note</span></button>
                                            <button class="icon-btn delete" onclick="Store.deleteItem('set',{subId:${s.id},topId:${t.id},subtopId:${st.id},setIndex:${idx}})"><span class="material-symbols-rounded">delete</span></button>
                                        </div>
                                      </div>`;
                            });
                            h += `</div>`;
                        });
                        h += `</div>`;
                    });
                    h += `</div></div>`;
                    c.innerHTML += h;
                });

                const pct = gT > 0 ? Math.round((gC / gT) * 100) : 0;
                document.getElementById('global-progress-bar').style.width = pct + "%";
                document.getElementById('global-stats').innerText = `${gC}/${gT} Sets (${pct}%)`;

                const completedQCount = Store.getCompletedQuestionsCount();
                const mockStatus = document.getElementById('mock-exam-status');
                if(completedQCount >= MIN_QUESTIONS_FOR_MOCK) mockStatus.innerHTML = `<span class="text-success">✅ Mock Exam Unlocked! ${completedQCount} questions available.</span>`;
                else mockStatus.innerHTML = `<span class="text-warning">🔒 Mock Exam: ${completedQCount}/${MIN_QUESTIONS_FOR_MOCK} questions. Need ${MIN_QUESTIONS_FOR_MOCK - completedQCount} more.</span>`;
            },

            promptAddTopic(sid) { const n = prompt("Topic:"); if(n) Store.addTopic(sid, n); },
            promptAddSubtopic(sid, tid) { const n = prompt("Subtopic:"); if(n) Store.addSubtopic(sid, tid, n); },
            promptRename(type, ids, oldName) { const n = prompt("Rename to:", oldName); if(n) Store.renameItem(type, ids, n); },
            shuffle(arr) { for(let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
            exportData() { const a = document.createElement('a'); a.href = 'data:json;charset=utf-8,' + encodeURIComponent(JSON.stringify(Store.data)); a.download = 'mcq-backup.json'; a.click(); },
            importBackup(inp) { const f = inp.files[0]; if(f) { const r = new FileReader(); r.onload = e => { try { Store.data = JSON.parse(e.target.result); Store.save(); location.reload(); } catch(e) { alert("Invalid file"); } }; r.readAsText(f); } },
            resetData() { if(confirm("Reset all data?")) { localStorage.removeItem('quizApp_v29'); location.reload(); } },
            markCurrentSetComplete() { const { subId, topId, subtopId, setIndex } = this.state.path; Store.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId).subtopics.find(st => st.id === subtopId).sets[setIndex].completed = true; Store.save(); alert("✅ Marked as complete!"); this.showDashboard(); },
            openSetEditor(subId, topId, subtopId, setIndex) { const set = Store.getSet(subId, topId, subtopId, setIndex); this.editor.qs = JSON.parse(JSON.stringify(set.questions)); this.editor.path = { subId, topId, subtopId, setIndex }; document.getElementById('editor-title').innerText = `Edit: ${set.name}`; this.renderEditor(); this.showView('view-editor'); },
            renderEditor() { const c = document.getElementById('editor-questions-container'); c.innerHTML = ''; this.editor.qs.forEach((q, i) => { c.innerHTML += `<div class="card p-3 mb-3 border"><div class="d-flex justify-content-between mb-2"><span class="badge bg-secondary">Q${i + 1}</span><button class="btn btn-sm btn-outline-danger" onclick="app.removeQ(${i})">Del</button></div><textarea class="form-control mb-2" onchange="app.editQ(${i},'q',this.value)">${q.q}</textarea><div class="row">${q.opts.map((o, k) => `<div class="col-6 mb-2"><input class="form-control" value="${o}" onchange="app.editOpt(${i},${k},this.value)"></div>`).join('')}</div><div class="row mt-2"><div class="col-4"><select class="form-select" onchange="app.editQ(${i},'ans',this.value)">${[0, 1, 2, 3].map(x => `<option value="${x}" ${q.ans == x ? 'selected' : ''}>${String.fromCharCode(65 + x)}</option>`).join('')}</select></div><div class="col-8"><input class="form-control" value="${q.note || ''}" placeholder="Note" onchange="app.editQ(${i},'note',this.value)"></div></div></div>`; }); },
            editQ(i, f, v) { if(f === 'ans') v = parseInt(v); this.editor.qs[i][f] = v; },
            editOpt(i, k, v) { this.editor.qs[i].opts[k] = v; },
            removeQ(i) { this.editor.qs.splice(i, 1); this.renderEditor(); },
            saveSetChanges() { Store.updateSetQuestions(this.editor.path, this.editor.qs); alert("Saved!"); this.showDashboard(); }
        };

        app.init();