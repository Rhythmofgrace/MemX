function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
        localStorage.setItem('color-theme', 'dark');
    } else {
        localStorage.setItem('color-theme', 'light');
    }
}

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
const REVISIONS_TO_PROMOTE = 2;
const TOPPER_TOTAL_Q = 40;
const TOPPER_MCQ_COUNT = 20;
const TOPPER_FILL_COUNT = 20;
const EXAM_Total_Q = 120;
const EXAM_TIME_PER_Q = 20;
const MIN_QUESTIONS_FOR_MOCK = 120;
const QUESTIONS_PER_SET = 20;

const DEV_SECRET = 'devmode';

const Store = {
    data: { subjects: [], questionStats: {} },
    load() { const s = localStorage.getItem('quizApp_v36'); if(s) this.data = JSON.parse(s); this.migrateData(); },
    save() { localStorage.setItem('quizApp_v36', JSON.stringify(this.data)); app.renderDashboard(); },
    migrateData() {
        if (!this.data.questionStats) this.data.questionStats = {};
        this.data.subjects.forEach(s => {
            s.topics.forEach(t => {
                if (t.viewSection === undefined) t.viewSection = null;
                if (t.topperRevisions === undefined) t.topperRevisions = 0;
                t.subtopics.forEach(st => {
                    st.sets.forEach(set => {
                        if (set.section === undefined) set.section = 'A';
                        if (set.sectionRevisions === undefined) set.sectionRevisions = 0;
                        if (set.questions) set.questions.forEach(q => { if (!q.id) q.id = 'q_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36); });
                    });
                });
            });
        });
    },
    addSubject(name) { this.data.subjects.push({ id: Date.now(), name, topics: [], isOpen: true, timeLimitSeconds: 0 }); this.save(); },
    addTopic(subId, name) { this.data.subjects.find(s => s.id === subId).topics.push({ id: Date.now(), name, subtopics: [], isOpen: false, shuffleQuestions: false, viewSection: null, topperRevisions: 0 }); this.save(); },
    addSubtopic(subId, topId, name) { this.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId).subtopics.push({ id: Date.now(), name, sets: [], isOpen: false, videoWatched: false }); this.save(); },
    toggleUI(ids) {
        const sub = this.data.subjects.find(s => s.id === ids.subId);
        if(!ids.topId) sub.isOpen = !sub.isOpen;
        else if(!ids.subtopId) sub.topics.find(t => t.id === ids.topId).isOpen = !sub.topics.find(t => t.id === ids.topId).isOpen;
        else sub.topics.find(t => t.id === ids.topId).subtopics.find(st => st.id === ids.subtopId).isOpen = !sub.topics.find(t => t.id === ids.topId).subtopics.find(st => st.id === ids.subtopId).isOpen;
        this.save();
    },
    setTopicViewSection(subId, topId, section) {
        const topic = this.data.subjects.find(s => s.id === subId)?.topics.find(t => t.id === topId);
        if (!topic) return;
        if (section === '__ALL__') topic.viewSection = null;
        else if (section === '__NONE__') return;
        else if (topic.viewSection === section) topic.viewSection = null;
        else topic.viewSection = section;
        this.save();
    },
    toggleVideoStatus(subId, topId, subtopId) {
        const st = this.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId).subtopics.find(x => x.id === subtopId);
        st.videoWatched = !st.videoWatched;
        this.save();
    },
    toggleShuffleQuestions(subId, topId) {
        const topic = this.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId);
        topic.shuffleQuestions = !topic.shuffleQuestions;
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
    getSet(subId, topId, subtopId, setIndex) { return this.data.subjects.find(s => s.id === subId)?.topics.find(t => t.id === topId)?.subtopics.find(st => st.id === subtopId)?.sets[setIndex]; },
    updateSubjectSettings(subId, settings) { const sub = this.data.subjects.find(s => s.id === subId); if(sub) { Object.assign(sub, settings); this.save(); } },
    getAllActiveSetsForTopic(subId, topId) {
        const sub = this.data.subjects.find(s => s.id === subId); if (!sub) return [];
        const topic = sub.topics.find(t => t.id === topId); if (!topic) return [];
        const allSets = [];
        topic.subtopics.forEach(st => { st.sets.forEach((set, idx) => { if (!set.completed) allSets.push({ set, subtopicId: st.id, setIndex: idx }); }); });
        return allSets;
    },
    getAllSetsForTopic(subId, topId) {
        const sub = this.data.subjects.find(s => s.id === subId); if (!sub) return [];
        const topic = sub.topics.find(t => t.id === topId); if (!topic) return [];
        const allSets = [];
        topic.subtopics.forEach(st => { st.sets.forEach((set, idx) => { allSets.push({ set, subtopicId: st.id, setIndex: idx }); }); });
        return allSets;
    },
    getAllQuestionsForTopic(subId, topId) {
        const allSets = this.getAllSetsForTopic(subId, topId); const questions = [];
        allSets.forEach(s => { if (s.set.questions) { s.set.questions.forEach(q => questions.push({ ...q })); } });
        return questions;
    },
    getTopicActiveSection(subId, topId) {
        const activeSets = this.getAllActiveSetsForTopic(subId, topId);
        if (activeSets.length === 0) return 'Topper';
        for (const section of SECTIONS) { const setsInSection = activeSets.filter(s => s.set.section === section); if (setsInSection.length > 0) return section; }
        return 'Topper';
    },
    isTopicSectionUnlocked(subId, topId, section) {
        if (section === 'A') return true;
        const activeSets = this.getAllActiveSetsForTopic(subId, topId);
        if (activeSets.length === 0) return true;
        const sectionIdx = SECTIONS.indexOf(section);
        if (sectionIdx <= 0) return true;
        for (let i = 0; i < sectionIdx; i++) { if (activeSets.filter(s => s.set.section === SECTIONS[i]).length > 0) return false; }
        return true;
    },
    canPracticeSet(subId, topId, set) {
        if (set.completed) return false;
        const activeSection = this.getTopicActiveSection(subId, topId);
        return set.section === activeSection;
    },
    isTopperUnlocked(subId, topId) {
        const allSets = this.getAllSetsForTopic(subId, topId);
        if (allSets.length === 0) return false;
        return allSets.every(s => s.set.completed === true);
    },
    promoteSet(set) {
        const currentIdx = SECTIONS.indexOf(set.section);
        if (currentIdx < SECTIONS.length - 1) { set.section = SECTIONS[currentIdx + 1]; set.sectionRevisions = 0; } 
        else { set.completed = true; set.sectionRevisions = 0; }
    },
    getTopicSectionSummary(subId, topId) {
        const allSets = this.getAllSetsForTopic(subId, topId); const summary = {};
        SECTIONS.forEach(sec => { summary[sec] = allSets.filter(s => s.set.section === sec && !s.set.completed).length; });
        summary.completedInE = allSets.filter(s => s.set.completed === true && s.set.section === 'E').length;
        summary.completed = allSets.filter(s => s.set.completed === true).length;
        summary.total = allSets.length;
        return summary;
    },
    getCompletedQuestionsCount() {
        let count = 0;
        this.data.subjects.forEach(s => { s.topics.forEach(t => { t.subtopics.forEach(st => { st.sets.forEach(set => { if(set.completed === true) count += (set.questions?.length || 0); }); }); }); });
        return count;
    },
    getCompletedSets() {
        let completedSets = [];
        this.data.subjects.forEach(s => { s.topics.forEach(t => { t.subtopics.forEach(st => { st.sets.forEach(set => { if(set.completed === true) completedSets.push({...set, subjectName: s.name}); }); }); }); });
        return completedSets;
    },
    getIncorrectPool() {
        let pool = [];
        this.data.subjects.forEach(s => {
            s.topics.forEach(t => { t.subtopics.forEach(st => { st.sets.forEach(set => {
                if (set.questions) set.questions.forEach(q => { if (this.data.questionStats && this.data.questionStats[q.id]?.inPool) pool.push({ ...q, subject: s.name }); });
            }); }); });
        });
        const unique = []; const ids = new Set();
        for(let q of pool) { if(!ids.has(q.id)) { ids.add(q.id); unique.push(q); } }
        return unique;
    }
};

const app = {
    state: { mode: 'practice', viewMode: 'card', questions: [], answers: [], grades: [], timer: null, index: 0, path: {}, locked: [], totalTimeLimit: 0, timeRemaining: 0, startTime: null, timeTaken: 0, questionModes: [] },
    editor: { qs: [], path: {} },
    pendingDocxText: '',
    activeSidebarSubject: null,
    devMode: false,
    devKeyBuffer: '',
    devPanelVisible: false,

    init() { 
        Store.load(); 
        this.renderDashboard(); 
        this.setupTimePreview(); 
        this.setupDevListener(); 
    },

    // DEV MODE METHODS
    setupDevListener() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            this.devKeyBuffer += e.key.toLowerCase();
            if (this.devKeyBuffer.length > 20) this.devKeyBuffer = this.devKeyBuffer.slice(-20);
            if (this.devKeyBuffer.includes(DEV_SECRET)) {
                this.devKeyBuffer = '';
                this.devMode = !this.devMode;
                this.onDevModeToggle();
            }
            if (this.devMode && !document.getElementById('view-quiz-active').classList.contains('hidden')) {
                if (e.ctrlKey && e.shiftKey && e.key === 'R') { e.preventDefault(); this.devMarkRevisionComplete(); }
                if (e.ctrlKey && e.shiftKey && e.key === 'P') { e.preventDefault(); this.devPromoteSection(); }
                if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); this.devMarkComplete(); }
                if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); this.devAutoAnswer(); }
            }
        });
    },
    onDevModeToggle() {
        const brand = document.getElementById('navbar-brand-text');
        if (this.devMode) {
            brand.innerHTML = 'MCQ Master <span class="dev-mode-indicator"></span>';
        } else {
            brand.innerHTML = 'MCQ Master<span class="text-primary text-3xl leading-[0] ml-0.5">.</span>';
            this.devPanelVisible = false;
            document.getElementById('dev-panel')?.classList.add('hidden');
        }
    },
    devTogglePanel() {
        this.devPanelVisible = !this.devPanelVisible;
        document.getElementById('dev-panel')?.classList.toggle('hidden', !this.devPanelVisible);
    },
    devShowPanel() {
        if (!this.devMode) return;
        this.devPanelVisible = true;
        const panel = document.getElementById('dev-panel');
        if (panel) { panel.classList.remove('hidden'); this.devUpdateInfo(); }
    },
    devUpdateInfo() {
        const info = document.getElementById('dev-set-info');
        if (!info) return;
        if (this.state.mode === 'exam') { info.innerText = '[ MOCK EXAM ]'; return; }
        if (this.state.mode === 'incorrect') { info.innerText = '[ INCORRECT SET REVIEW ]'; return; }
        if (this.state.mode === 'topper') {
            const { subId, topId } = this.state.path;
            const topic = Store.data.subjects.find(s => s.id === subId)?.topics.find(t => t.id === topId);
            info.innerText = `[ TOPPER | Revs: ${topic?.topperRevisions || 0} | Unlimited ]`;
            return;
        }
        const { subId, topId, subtopId, setIndex } = this.state.path;
        if (!subId) { info.innerText = '[ no context ]'; return; }
        const set = Store.getSet(subId, topId, subtopId, setIndex);
        if (!set) { info.innerText = '[ not found ]'; return; }
        info.innerText = `[ ${set.name} | Sec: ${set.section} | Rev: ${set.sectionRevisions}/${REVISIONS_TO_PROMOTE} | Done: ${set.completed ? 'Y' : 'N'} ]`;
    },
    devMarkRevisionComplete() {
        if (!this.devMode) return;
        if (this.state.mode === 'topper') {
            const { subId, topId } = this.state.path;
            const topic = Store.data.subjects.find(s => s.id === subId)?.topics.find(t => t.id === topId);
            if (topic) { topic.topperRevisions = (topic.topperRevisions || 0) + 1; Store.save(); this.devUpdateInfo(); }
            return;
        }
        if (this.state.mode === 'exam' || this.state.mode === 'incorrect') return;
        const { subId, topId, subtopId, setIndex } = this.state.path;
        if (!subId) return;
        const set = Store.getSet(subId, topId, subtopId, setIndex);
        if (!set || set.completed) return;
        set.sectionRevisions = (set.sectionRevisions || 0) + 1;
        if (set.sectionRevisions >= REVISIONS_TO_PROMOTE) { Store.promoteSet(set); }
        Store.save(); this.devUpdateInfo();
    },
    devPromoteSection() {
        if (!this.devMode || this.state.mode === 'exam' || this.state.mode === 'topper' || this.state.mode === 'incorrect') return;
        const { subId, topId, subtopId, setIndex } = this.state.path;
        if (!subId) return;
        const set = Store.getSet(subId, topId, subtopId, setIndex);
        if (!set || set.completed) return;
        Store.promoteSet(set); Store.save(); this.devUpdateInfo();
    },
    devMarkComplete() {
        if (!this.devMode) return;
        if (this.state.mode === 'topper') {
            const { subId, topId } = this.state.path;
            const topic = Store.data.subjects.find(s => s.id === subId)?.topics.find(t => t.id === topId);
            if (topic) { topic.topperRevisions = (topic.topperRevisions || 0) + 5; } 
            Store.save(); if (this.state.timer) clearInterval(this.state.timer); this.showDashboard();
            return;
        }
        if (this.state.mode === 'exam' || this.state.mode === 'incorrect') return;
        const { subId, topId, subtopId, setIndex } = this.state.path;
        if (!subId) return;
        const set = Store.getSet(subId, topId, subtopId, setIndex);
        if (!set) return;
        set.completed = true; set.sectionRevisions = 0;
        Store.save(); if (this.state.timer) clearInterval(this.state.timer); this.showDashboard();
    },
    devAutoAnswer() {
        if (!this.devMode) return;
        this.state.questions.forEach((q, i) => {
            if (this.state.questionModes && this.state.questionModes[i] === 'fill') { this.state.answers[i] = q.opts[q.ans]; } 
            else { this.state.answers[i] = q.ans; }
        });
        this.submitQuiz();
    },

    setupTimePreview() { const el = document.getElementById('settings-total-time'); if(el) el.addEventListener('input', (e) => this.updateTimePreview(parseInt(e.target.value) || 0)); },
    updateTimePreview(seconds) {
        const previewEl = document.getElementById('time-preview'); if(!previewEl) return;
        if(seconds <= 0) previewEl.innerText = 'No limit';
        else previewEl.innerHTML = `${seconds}s/Q <span class="text-sm font-normal text-blue-500">(~${this.formatTimeVerbose(seconds * 20)} for 20 Qs)</span>`;
    },
    formatTimeVerbose(seconds) {
        if(seconds <= 0) return 'No limit';
        const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
        let parts = []; if(h > 0) parts.push(`${h}h`); if(m > 0) parts.push(`${m}m`); if(s > 0) parts.push(`${s}s`);
        return parts.join(' ') || '0s';
    },

    showView(id) {
        document.querySelectorAll('main > div > div[id^="view-"]').forEach(e => e.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        if(id === 'view-subject-settings') { const input = document.getElementById('settings-total-time'); input.oninput = (e) => this.updateTimePreview(parseInt(e.target.value) || 0); }
    },
    showDashboard() { this.renderDashboard(); this.showView('view-dashboard'); },
    showAddSubjectModal() { const n = prompt("Subject Name:"); if(n) { Store.addSubject(n); this.activeSidebarSubject = Store.data.subjects[Store.data.subjects.length-1].id; this.renderDashboard(); } },
    openSubjectSettings(subId) {
        const sub = Store.data.subjects.find(s => s.id === subId);
        document.getElementById('settings-subject-name').innerText = sub.name; document.getElementById('settings-subject-id').value = subId; document.getElementById('settings-total-time').value = sub.timeLimitSeconds || 0;
        this.showView('view-subject-settings'); this.updateTimePreview(sub.timeLimitSeconds || 0);
    },
    saveSubjectSettings() {
        const subId = parseInt(document.getElementById('settings-subject-id').value);
        const v = Math.max(0, Math.min(36000, parseInt(document.getElementById('settings-total-time').value) || 0));
        Store.updateSubjectSettings(subId, { timeLimitSeconds: v }); this.showDashboard();
    },

    // Importer functions
    setupImportBtn(subId, topId, subtopId, name) { const safeName = name.replace(/'/g, "&#39;").replace(/"/g, "&quot;"); return `onclick="event.stopPropagation(); app.openImporter(this)" data-ids='${JSON.stringify({subId, topId, subtopId})}' data-name="${safeName}"`; },
    setupTopicImportBtn(subId, topId, name) { const safeName = name.replace(/'/g, "&#39;").replace(/"/g, "&quot;"); return `onclick="event.stopPropagation(); app.openImporter(this)" data-ids='${JSON.stringify({subId, topId})}' data-name="${safeName}"`; },
    openImporter(btn) {
        const ids = JSON.parse(btn.getAttribute('data-ids')); const name = btn.getAttribute('data-name');
        document.getElementById('import-target-display').innerText = !ids.subtopId ? name + " (New Subtopics)" : name;
        document.getElementById('import-target-id').value = JSON.stringify(ids);
        document.getElementById('docx-input').value = ''; document.getElementById('import-text').value = ''; document.getElementById('import-preview-container').classList.add('hidden');
        this.showView('view-importer');
    },
    cleanText(str) { if(!str) return ""; return str.replace(/\*\*/g,"").replace(/\*/g,"").replace(/^>\s*/gm,"").replace(/\[([^\]]*)\]/g,"$1").replace(/#{1,6}\s*/g,"").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").trim(); },
    convertDocxToText(html) {
        let t = html.replace(/<\/p>/gi,'\n\n').replace(/<\/div>/gi,'\n\n').replace(/<\/h[1-6]>/gi,'\n\n').replace(/<br\s*\/?>/gi,'\n').replace(/<\/li>/gi,'\n').replace(/<[^>]*>/g,'');
        t = t.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&rsquo;/g,"'").replace(/&lsquo;/g,"'").replace(/&rdquo;/g,'"').replace(/&ldquo;/g,'"').replace(/&ndash;/g,'-').replace(/&mdash;/g,'-');
        return t.replace(/\n{3,}/g,'\n\n').split('\n').map(l=>l.trim()).join('\n').trim();
    },
    parseQuestionsFromText(rawText) {
        const questions = []; rawText = rawText.replace(/\r\n/g,"\n").replace(/\r/g,"\n").replace(/\*\*/g,'').replace(/\*/g,'').replace(/^#{1,6}\s*.*$/gm,'').replace(/^Topic\s*\d+[:\.].*$/gmi,'').replace(/^>\s*/gm,'');
        const regex = /\n(?:Q\s*)?(\d+)[\.\)]\s+/gi; let matches = [], match; const tempText = '\n' + rawText;
        while((match = regex.exec(tempText)) !== null) matches.push({ index: match.index, number: parseInt(match[1]) });
        if(matches.length === 0) return [];
        for(let i = 0; i < matches.length; i++) { const block = tempText.substring(matches[i].index, i < matches.length-1 ? matches[i+1].index : tempText.length); const parsed = this.parseQuestionBlock(block); if(parsed) questions.push(parsed); }
        return questions;
    },
    parseQuestionBlock(block) {
        try {
            block = block.trim(); const lines = block.split('\n').map(l=>l.trim()).filter(l=>l); if(lines.length < 3) return null;
            let questionText = '', optionStartIndex = -1;
            const firstLineMatch = lines[0].match(/^(?:Q\s*)?(\d+)[\.\)]\s*(.*)$/i); if(firstLineMatch) questionText = firstLineMatch[2];
            for(let i=1;i<lines.length;i++){if(/^[A-D][\.\)]\s/i.test(lines[i])){optionStartIndex=i;break;}questionText+=' '+lines[i];}
            questionText = this.cleanText(questionText);
            const options=['','','',''], optionLabels=['A','B','C','D'];
            let currentOption=-1,correctAnswer=0,note='',inNote=false;
            for(let i=optionStartIndex;i<lines.length;i++){
                const line=lines[i];
                const optMatch=line.match(/^([A-D])[\.\)]\s*(.*)$/i);
                if(optMatch){const idx=optionLabels.indexOf(optMatch[1].toUpperCase());if(idx!==-1){currentOption=idx;options[idx]=this.cleanText(optMatch[2]);inNote=false;continue;}}
                const ansMatch=line.match(/^(?:Correct\s+)?Answer[:\s]+([A-D])(?:[\)\]]|\s|$)/i);
                if(ansMatch){correctAnswer=optionLabels.indexOf(ansMatch[1].toUpperCase());if(correctAnswer===-1)correctAnswer=0;inNote=false;continue;}
                const noteMatch=line.match(/^(?:Note|Explanation)[:\s]+(.*)$/i);
                if(noteMatch){note=this.cleanText(noteMatch[1]);inNote=true;continue;}
                if(inNote&&line&&!line.match(/^[A-D][\.\)]/i)&&!line.match(/^(?:Q\s*)?\d+[\.\)]/i)){note+=' '+this.cleanText(line);continue;}
                if(currentOption!==-1&&!line.match(/^(?:Correct\s+)?Answer/i)&&!line.match(/^(?:Note|Explanation)/i))options[currentOption]+=' '+this.cleanText(line);
            }
            for(let i=0;i<options.length;i++)options[i]=options[i].trim();
            return { id: 'q_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36), q: questionText, opts: options, ans: correctAnswer, note: note.trim() };
        }catch(e){return null;}
    },
    async previewDocx() {
        const input=document.getElementById('docx-input'); if(input.files.length===0){alert("Select files first.");return;}
        let allText='';
        for(let i=0;i<input.files.length;i++){ const ab=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsArrayBuffer(input.files[i]);}); const res=await mammoth.convertToHtml({arrayBuffer:ab}); allText+='\n\n'+this.convertDocxToText(res.value); }
        this.pendingDocxText=allText; this.showPreview(this.parseQuestionsFromText(allText));
    },
    previewImport() { const txt=document.getElementById('import-text').value; if(!txt.trim()){alert("Paste questions first.");return;} this.showPreview(this.parseQuestionsFromText(txt)); },
    showPreview(questions) {
        const container=document.getElementById('import-preview'); document.getElementById('import-preview-container').classList.remove('hidden'); container.innerHTML='';
        if(questions.length===0){container.innerHTML='<div class="text-red-500 font-medium p-4">No valid questions found.</div>';return;}
        document.getElementById('preview-stats').innerText=`${questions.length} questions`;
        questions.forEach((q,i)=>{
            let html=`<div class="preview-question"><strong>Q${i+1}</strong> ${q.q}<div class="text-sm mt-2 space-y-1">`;
            q.opts.forEach((o,idx)=>{html+=`<div class="${idx===q.ans?'text-green-600 font-bold':''}">${String.fromCharCode(65+idx)}) ${o}${idx===q.ans?' ✓':''}</div>`;});
            html+='</div></div>'; container.innerHTML+=html;
        });
    },
    splitIntoSets(questions, existingCount) {
        const sets=[];let counter=existingCount+1;
        for(let i=0;i<questions.length;i+=QUESTIONS_PER_SET){ sets.push({name:`Set ${counter++}`,questions:questions.slice(i,i+QUESTIONS_PER_SET),completed:false,section:'A',sectionRevisions:0}); }
        return sets;
    },
    async processDocxSets() {
        const input=document.getElementById('docx-input'); if(input.files.length===0){alert("Select files.");return;}
        const ids=JSON.parse(document.getElementById('import-target-id').value);
        if(!ids.subtopId){
            let importedCount=0; const topic=Store.data.subjects.find(s=>s.id===ids.subId).topics.find(t=>t.id===ids.topId);
            for(let i=0;i<input.files.length;i++){
                const file=input.files[i];const subtopicName=file.name.replace(/\.docx$/i,"");
                const ab=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsArrayBuffer(file);});
                const html=await mammoth.convertToHtml({arrayBuffer:ab}); const questions=this.parseQuestionsFromText(this.convertDocxToText(html.value));
                if(questions.length>0){topic.subtopics.push({id:Date.now()+i,name:subtopicName,sets:this.splitIntoSets(questions,0),isOpen:false,videoWatched:false});importedCount++;}
            }
            Store.save();
        }else{
            let allText=this.pendingDocxText||'';
            if(!allText){for(let i=0;i<input.files.length;i++){const ab=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsArrayBuffer(input.files[i]);});allText+='\n\n'+this.convertDocxToText((await mammoth.convertToHtml({arrayBuffer:ab})).value);}}
            const questions=this.parseQuestionsFromText(allText); if(questions.length===0){alert("No valid questions.");return;}
            const subtop=Store.data.subjects.find(s=>s.id===ids.subId).topics.find(t=>t.id===ids.topId).subtopics.find(st=>st.id===ids.subtopId);
            subtop.sets=subtop.sets.concat(this.splitIntoSets(questions,subtop.sets.length)); Store.save();
        }
        this.showDashboard();
    },
    processTextImport() {
        const txt=document.getElementById('import-text').value; const questions=this.parseQuestionsFromText(txt); if(questions.length===0){alert("No valid questions.");return;}
        const ids=JSON.parse(document.getElementById('import-target-id').value);
        if(!ids.subtopId){
            const name=prompt("Name for new Subtopic:");if(!name)return;
            Store.data.subjects.find(s=>s.id===ids.subId).topics.find(t=>t.id===ids.topId).subtopics.push({id:Date.now(),name,sets:this.splitIntoSets(questions,0),isOpen:false,videoWatched:false});
        }else{
            const subtop=Store.data.subjects.find(s=>s.id===ids.subId).topics.find(t=>t.id===ids.topId).subtopics.find(st=>st.id===ids.subtopId);
            subtop.sets=subtop.sets.concat(this.splitIntoSets(questions,subtop.sets.length));
        }
        Store.save(); this.showDashboard();
    },

    // Quiz Core
    quitQuiz() { if(confirm("Exit? Progress will be lost.")){ if(this.state.timer)clearInterval(this.state.timer); this.showDashboard(); } },
    formatTime(seconds) { const m=Math.floor(seconds/60);const s=seconds%60; return `${m}:${s.toString().padStart(2,'0')}`; },
    shuffleOptions(question) { const indices=[0,1,2,3]; for(let i=indices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];} return {...question,opts:indices.map(idx=>question.opts[idx]),ans:indices.indexOf(question.ans)}; },
    shuffleAllOptions(questions){return questions.map(q=>this.shuffleOptions(q));},
    shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;},

    startTopper(subId, topId) {
        const sub = Store.data.subjects.find(s => s.id === subId); const topic = sub.topics.find(t => t.id === topId);
        if (!Store.isTopperUnlocked(subId, topId)) { alert("🔒 Complete all sets through Section E first!"); return; }
        const allQuestions = Store.getAllQuestionsForTopic(subId, topId); if (allQuestions.length === 0) { alert("No questions found."); return; }
        const shuffled = this.shuffle([...allQuestions]); const pool = shuffled.slice(0, TOPPER_TOTAL_Q); 
        const mcqQuestions = pool.slice(0, Math.min(TOPPER_MCQ_COUNT, pool.length)); const fillQuestions = pool.slice(TOPPER_MCQ_COUNT, TOPPER_MCQ_COUNT + TOPPER_FILL_COUNT);
        const mcqShuffled = this.shuffleAllOptions(mcqQuestions).map(q => ({ ...q, subject: sub.name })); const fillMapped = fillQuestions.map(q => ({ ...q, subject: sub.name }));
        this.state.questions = [...mcqShuffled, ...fillMapped];
        this.state.questionModes = [ ...new Array(mcqShuffled.length).fill('mcq'), ...new Array(fillMapped.length).fill('fill') ];
        this.state.mode = 'topper'; this.state.path = { subId, topId }; this.state.locked = [];
        const timePerQ = sub.timeLimitSeconds || 0; this.state.totalTimeLimit = timePerQ > 0 ? (timePerQ * this.state.questions.length) : 0;
        this.startQuizSession();
    },
    prepMockExam() {
        const completedQCount=Store.getCompletedQuestionsCount();
        if(completedQCount<MIN_QUESTIONS_FOR_MOCK){alert(`🔒 Need ${MIN_QUESTIONS_FOR_MOCK} questions. Have ${completedQCount}.`);return;}
        let pool=[]; Store.getCompletedSets().forEach(set=>set.questions.forEach(q=>pool.push({...q,subject:set.subjectName})));
        this.state.questions=this.shuffleAllOptions(this.shuffle(pool).slice(0,EXAM_Total_Q));
        this.state.mode='exam'; this.state.questionModes=new Array(this.state.questions.length).fill('mcq'); this.state.locked=new Array(this.state.questions.length).fill(false);
        this.state.totalTimeLimit=EXAM_Total_Q*EXAM_TIME_PER_Q; this.startQuizSession();
    },
    startSet(subId, topId, subtopId, setIndex) {
        const sub=Store.data.subjects.find(s=>s.id===subId); const topic=sub.topics.find(t=>t.id===topId); const subtopic=topic.subtopics.find(st=>st.id===subtopId);
        if(subtopic.videoWatched!==true){alert("⚠️ Watch the video first!");return;}
        const set=subtopic.sets[setIndex]; if(!Store.canPracticeSet(subId,topId,set)){alert(`🔒 Section ${set.section} is locked. Complete prior section first.`);return;}
        this.state.mode='practice'; this.state.path={subId,topId,subtopId,setIndex};
        let questions=[...set.questions].map(q=>({...q,subject:sub.name}));
        if(topic.shuffleQuestions===true) questions=this.shuffle([...questions]); questions=this.shuffleAllOptions(questions);
        this.state.questions=questions; this.state.questionModes=new Array(questions.length).fill('mcq'); this.state.locked=[];
        const timePerQ=sub.timeLimitSeconds||0; this.state.totalTimeLimit=timePerQ>0?(timePerQ*this.state.questions.length):0;
        this.startQuizSession();
    },
    startIncorrectSet(setIndex) {
        const pool = Store.getIncorrectPool(); const setQs = pool.slice(setIndex * QUESTIONS_PER_SET, (setIndex + 1) * QUESTIONS_PER_SET);
        this.state.mode = 'incorrect'; this.state.path = { incorrectSetIndex: setIndex };
        let questions = this.shuffle([...setQs]); questions = this.shuffleAllOptions(questions);
        this.state.questions = questions; this.state.questionModes = new Array(questions.length).fill('mcq'); this.state.locked = []; this.state.totalTimeLimit = 0; 
        this.startQuizSession();
    },

    startQuizSession() {
        this.state.answers = this.state.questions.map((q, i) => { return (this.state.questionModes[i] === 'fill') ? '' : null; });
        this.state.grades=[]; this.state.index=0; this.state.startTime=Date.now(); this.state.timeTaken=0; this.state.timeRemaining=this.state.totalTimeLimit;
        document.body.className=this.state.mode+'-mode bg-background-light text-text-light font-sans antialiased min-h-screen transition-colors duration-200';
        const titleMap={'exam':'Mock Exam','practice':'Practice (MCQ)','topper':'🏆 Topper Challenge', 'incorrect': '⚠️ Most Incorrect'};
        document.getElementById('quiz-header-title').innerText=titleMap[this.state.mode]||'Practice';
        document.getElementById('palette-card').classList.toggle('hidden',this.state.mode!=='exam');
        document.getElementById('btn-skip').classList.toggle('hidden',this.state.mode!=='exam'); document.getElementById('btn-prev').classList.toggle('hidden',this.state.mode==='exam');
        const timerContainer=document.getElementById('timer-container'); if(this.state.timer)clearInterval(this.state.timer);
        if(this.state.totalTimeLimit>0){
            timerContainer.classList.remove('hidden'); document.getElementById('quiz-timer-text').innerText=this.formatTime(this.state.timeRemaining);
            this.state.timer=setInterval(()=>{
                this.state.timeRemaining--; this.state.timeTaken=Math.floor((Date.now()-this.state.startTime)/1000);
                document.getElementById('quiz-timer-text').innerText=this.formatTime(this.state.timeRemaining);
                timerContainer.classList.remove('text-yellow-600', 'text-red-600');
                if(this.state.timeRemaining<=60)timerContainer.classList.add('text-red-600'); else if(this.state.timeRemaining<=120)timerContainer.classList.add('text-yellow-600');
                if(this.state.timeRemaining<=0){clearInterval(this.state.timer);alert("⏰ Time's up!");this.submitQuiz();}
            },1000);
        }else{ timerContainer.classList.add('hidden'); this.state.timer=setInterval(()=>{this.state.timeTaken=Math.floor((Date.now()-this.state.startTime)/1000);},1000); }
        this.showView('view-quiz-active'); this.renderQuestion(); this.renderPalette();
        if(this.devMode) this.devShowPanel();
    },

    renderQuestion() {
        const idx=this.state.index; const q=this.state.questions[idx]; const ans=this.state.answers[idx]; const qMode=this.state.questionModes[idx];
        document.getElementById('quiz-q-num')?.classList.remove('hidden'); document.getElementById('quiz-q-num').innerText = `Q ${idx+1}/${this.state.questions.length}`;
        const subjectTag = document.getElementById('quiz-subject-tag');
        if (this.state.mode === 'topper') { subjectTag.innerText = qMode === 'fill' ? '✏️ Fill in Blank' : '📝 MCQ'; subjectTag.className = `bg-${qMode==='fill'?'yellow':'blue'}-100 text-${qMode==='fill'?'yellow':'primary'}-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide border border-${qMode==='fill'?'yellow':'blue'}-200`; } 
        else if (this.state.mode === 'incorrect') { subjectTag.innerText = '⚠️ Review'; subjectTag.className = `bg-red-500 text-white px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide shadow-sm`; } 
        else { subjectTag.innerText = q.subject; subjectTag.className = 'bg-blue-100 text-primary px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide'; }
        document.getElementById('quiz-question-text').innerText = q.q;
        const optCont=document.getElementById('quiz-options'); const inpCont=document.getElementById('quiz-input-container'); const noteCont=document.getElementById('quiz-note-container');
        noteCont.classList.add('hidden');

        if (qMode === 'fill') {
            optCont.classList.add('hidden'); inpCont.classList.remove('hidden');
            const txtInput = document.getElementById('quiz-text-input'); txtInput.value = ans || ''; txtInput.focus();
        } else {
            inpCont.classList.add('hidden'); optCont.classList.remove('hidden'); optCont.innerHTML='';
            if((this.state.mode==='practice' || this.state.mode === 'incorrect') && ans!==null && q.note){ noteCont.classList.remove('hidden'); document.getElementById('quiz-note-text').innerText=q.note; }
            q.opts.forEach((opt,i)=>{
                const btn=document.createElement('button'); btn.className='option-card';
                if((this.state.mode==='practice' || this.state.mode==='topper' || this.state.mode==='incorrect') && ans!==null){
                    btn.disabled=true; if(i===q.ans)btn.classList.add('correct'); else if(i===ans&&ans>=0)btn.classList.add('wrong');
                    if(q.note){ noteCont.classList.remove('hidden'); document.getElementById('quiz-note-text').innerText=q.note; }
                }else if(this.state.mode==='exam'){
                    const isLocked=this.state.locked[idx]; if(isLocked){btn.disabled=true;if(ans===i)btn.classList.add('selected');} else if(ans===i)btn.classList.add('selected');
                }
                btn.innerHTML=`<span class="inline-block w-8 font-bold">${String.fromCharCode(65+i)})</span> <span class="ml-1">${opt||'<em class="text-gray-400">Empty</em>'}</span>`;
                btn.onclick=()=>this.recordAnswer(i); optCont.appendChild(btn);
            });
        }
        const isLast=idx===this.state.questions.length-1;
        document.getElementById('btn-next').classList.toggle('hidden',isLast); document.getElementById('btn-submit').classList.toggle('hidden',!isLast);
        this.renderPalette();
    },
    recordAnswer(i) {
        const idx=this.state.index; const qMode = this.state.questionModes[idx]; if (qMode === 'fill') return; 
        if((this.state.mode==='practice'||this.state.mode==='topper'||this.state.mode==='incorrect')&&this.state.answers[idx]!==null) return;
        if(this.state.mode==='exam'&&this.state.locked[idx]) return;
        this.state.answers[idx]=i;
        if(this.state.mode==='exam'){
            this.state.locked[idx]=true;
            setTimeout(()=>{ if(idx<this.state.questions.length-1){this.state.index++;this.renderQuestion();this.renderPalette();} else this.submitQuiz(); },300);
        }else{this.renderQuestion();}
    },
    recordTextAnswer(val){this.state.answers[this.state.index]=val;},
    nextQuestion(){if(this.state.index<this.state.questions.length-1){this.state.index++;this.renderQuestion();}},
    prevQuestion(){if(this.state.index>0){this.state.index--;this.renderQuestion();}},
    skipQuestion(){ if(this.state.mode==='exam'){ this.state.answers[this.state.index]=-2; this.state.locked[this.state.index]=true; this.nextQuestion(); } },

    renderPalette(){
        if(this.state.mode!=='exam')return; const g=document.getElementById('q-palette-grid'); g.innerHTML='';
        this.state.answers.forEach((a,i)=>{
            const d=document.createElement('div'); d.className='q-dot';d.innerText=i+1;
            if(i===this.state.index)d.classList.add('active');
            if(this.state.locked[i]){ if(a!==null&&a>=0)d.classList.add('answered'); else if(a===-2)d.classList.add('skipped'); else d.classList.add('locked'); }
            g.appendChild(d);
        });
    },

    submitQuiz(manualScore=null) {
        if(this.state.timer)clearInterval(this.state.timer); this.state.timeTaken=Math.floor((Date.now()-this.state.startTime)/1000);
        const hasFillQuestions = this.state.questionModes.some(m => m === 'fill');
        if (hasFillQuestions && manualScore === null && !this.state._gradingDone) { this.renderGradingView(); return; }
        let c=0,w=0;

        if(manualScore){ c=manualScore.correct; w=manualScore.wrong; } 
        else {
            this.state.questions.forEach((q,i)=>{
                const qMode = this.state.questionModes[i]; const a=this.state.answers[i];
                if (qMode === 'fill') { if (this.state.grades[i] === true) c++; else if (this.state.grades[i] === false) w++; } 
                else { if(a!==null&&a>=0){if(a===q.ans)c++;else w++;} }
            });
        }

        if (!manualScore) {
            if (!Store.data.questionStats) Store.data.questionStats = {};
            this.state.questions.forEach((q,i) => {
                const qMode = this.state.questionModes[i]; const a = this.state.answers[i]; let isC = false; let attempted = false;
                if (qMode === 'fill' && this.state.grades[i] !== null) { attempted = true; isC = this.state.grades[i] === true; } 
                else if (qMode === 'mcq' && a !== null && a >= 0) { attempted = true; isC = (a === q.ans); }

                if (attempted) {
                    if (!Store.data.questionStats[q.id]) Store.data.questionStats[q.id] = { wrongStreak: 0, correctStreak: 0, inPool: false };
                    let stats = Store.data.questionStats[q.id];
                    if (this.state.mode === 'incorrect') {
                        if (isC) { stats.correctStreak = (stats.correctStreak || 0) + 1; stats.wrongStreak = 0; if (stats.correctStreak >= 3) { stats.inPool = false; stats.correctStreak = 0; } } 
                        else { stats.correctStreak = 0; stats.wrongStreak = (stats.wrongStreak || 0) + 1; }
                    } else {
                        if (isC) { stats.wrongStreak = 0; } 
                        else { stats.wrongStreak = (stats.wrongStreak || 0) + 1; stats.correctStreak = 0; if (stats.wrongStreak >= 3) { stats.inPool = true; } }
                    }
                }
            });
            Store.save();
        }

        const netMarks=(c*1)-(w*0.33); const isPerfect=c===this.state.questions.length; let revisionMessage="";
        if(this.state.mode==='practice'){
            const{subId,topId,subtopId,setIndex}=this.state.path; const set=Store.data.subjects.find(s=>s.id===subId).topics.find(t=>t.id===topId).subtopics.find(st=>st.id===subtopId).sets[setIndex];
            if(isPerfect){
                set.sectionRevisions=(set.sectionRevisions||0)+1;
                if(set.sectionRevisions>=REVISIONS_TO_PROMOTE){
                    const oldSec=set.section; Store.promoteSet(set);
                    if(set.completed) revisionMessage=`<div class="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3"><span class="material-icons">workspace_premium</span> 🎉 Mastered! Promoted from Section ${oldSec} — all sections complete!</div>`;
                    else revisionMessage=`<div class="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3"><span class="material-icons">trending_up</span> 🎉 Promoted: Section ${oldSec} → ${set.section}!</div>`;
                }else{ revisionMessage=`<div class="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-center gap-3"><span class="material-icons">check_circle</span> ✅ Perfect! Rev ${set.sectionRevisions}/${REVISIONS_TO_PROMOTE} in Section ${set.section}.</div>`; }
            }else{ revisionMessage=`<div class="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-center gap-3"><span class="material-icons">warning</span> Score: ${c}/${this.state.questions.length}. Need 100% for revision credit. (${set.sectionRevisions||0}/${REVISIONS_TO_PROMOTE} in Sec ${set.section})</div>`; }
            Store.save();
        } else if (this.state.mode === 'topper') {
            const { subId, topId } = this.state.path; const topic = Store.data.subjects.find(s => s.id === subId).topics.find(t => t.id === topId);
            if (isPerfect) { topic.topperRevisions = (topic.topperRevisions || 0) + 1; revisionMessage = `<div class="bg-yellow-50 border border-yellow-300 text-yellow-800 p-4 rounded-xl flex items-center gap-3"><span class="material-icons text-2xl">emoji_events</span> <div><h4 class="font-bold">🏆 PERFECT SCORE!</h4><p class="text-sm">You earned a Topper Revision. Total successful revisions: ${topic.topperRevisions}</p></div></div>`; } 
            else { revisionMessage = `<div class="bg-gray-50 border border-gray-200 text-gray-700 p-4 rounded-xl flex items-center gap-3"><span class="material-icons">info</span> Score: ${c}/${this.state.questions.length}. Need 100% to increase your Topper revision count. (Current Revisions: ${topic.topperRevisions || 0})</div>`; }
            Store.save();
        } else if (this.state.mode === 'incorrect') { revisionMessage = `<div class="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-center gap-3"><span class="material-icons">insights</span> Review completed. Correct answers gained a redemption streak. Questions that hit a 3-streak are permanently removed from the Most Incorrect pool.</div>`; }

        document.getElementById('practice-actions').classList.toggle('hidden', this.state.mode === 'exam' || this.state.mode === 'topper' || this.state.mode === 'incorrect');
        document.getElementById('res-correct').innerText=c; document.getElementById('res-wrong').innerText=w; document.getElementById('res-total').innerText=netMarks.toFixed(2);
        document.getElementById('revision-status').innerHTML=revisionMessage;
        const avg=this.state.questions.length?(this.state.timeTaken/this.state.questions.length).toFixed(1):0;
        document.getElementById('res-time-taken').innerText=this.formatTime(this.state.timeTaken); document.getElementById('res-avg-time').innerText=`${avg}s`;
        
        const d=document.getElementById('result-details'); d.innerHTML='';
        this.state.questions.forEach((q,i)=>{
            const qMode = this.state.questionModes[i]; const u=this.state.answers[i]; const stats = Store.data.questionStats?.[q.id] || { wrongStreak: 0, correctStreak: 0 };
            if (qMode === 'fill') {
                const isC = this.state.grades[i] === true;
                const statusClass = isC ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50';
                const statusLabel = isC ? '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">Correct</span>' : '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">Wrong</span>';
                let h = `<div class="p-6 mb-4 border rounded-xl shadow-sm ${statusClass}"><div class="flex justify-between items-start mb-4"><strong class="text-lg text-gray-900 mr-4">${i+1}. ${q.q}</strong><div class="flex items-center gap-2 flex-shrink-0">${this.state.mode === 'incorrect' ? `<span class="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold">Streak: ${stats.correctStreak}/3</span>` : ''}<span class="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold">Fill</span>${statusLabel}</div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="user-answer-box"><small class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Your Answer</small><div class="text-gray-900 font-medium">${u||'<em class="text-gray-400">Empty</em>'}</div></div><div class="correct-answer-box"><small class="text-xs font-bold opacity-75 uppercase tracking-wider block mb-1">Correct Answer</small><div class="font-bold text-lg">${q.opts[q.ans]}</div></div></div>`;
                if(q.note) h+=`<div class="text-sm bg-white border border-gray-200 text-gray-600 p-3 mt-4 rounded-lg"><span class="font-bold">Note:</span> ${q.note}</div>`;
                h+='</div>'; d.innerHTML+=h;
            } else {
                const isC=u===q.ans;const isUn=u===null||u===-2;
                const statusClass=isC?'border-green-300 bg-white':(isUn?'border-gray-300 bg-gray-50':'border-red-300 bg-red-50');
                const statusLabel=u===-2?'<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">Skipped</span>':(u===null?'<span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">Not Attempted</span>':'');
                let htmlBody='<div class="space-y-2">';
                q.opts.forEach((o,k)=>{htmlBody+=`<div class="${k===q.ans?'text-green-600 font-bold bg-green-50 p-2 rounded':(k===u&&!isUn?'text-red-600 font-bold bg-red-50 p-2 rounded':'text-gray-700 p-2')}"><span class="inline-block w-6">${String.fromCharCode(65+k)})</span> ${o||'<em class="text-gray-400">Empty</em>'}</div>`;});
                htmlBody += '</div>';
                let modeBadge = ''; if(this.state.mode==='topper') modeBadge = '<span class="bg-blue-100 text-primary px-2 py-0.5 rounded text-xs font-bold mr-2">MCQ</span>'; else if (this.state.mode==='incorrect') modeBadge = `<span class="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold mr-2">Streak: ${stats.correctStreak}/3</span>`;
                let h=`<div class="p-6 mb-4 border rounded-xl shadow-sm ${statusClass}"><div class="flex justify-between items-start mb-4"><strong class="text-lg text-gray-900 mr-4">${i+1}. ${q.q}</strong><div class="flex items-center flex-shrink-0">${modeBadge}${statusLabel}</div></div>${htmlBody}`;
                if(q.note) h+=`<div class="text-sm bg-white border border-gray-200 text-gray-600 p-3 mt-4 rounded-lg"><span class="font-bold">Note:</span> ${q.note}</div>`;
                h+='</div>'; d.innerHTML+=h;
            }
        });
        this.state._gradingDone = false; this.showView('view-results');
    },

    renderGradingView() {
        const list = document.getElementById('grading-list'); list.innerHTML = '';
        this.state.grades = this.state.questions.map((q, i) => {
            if (this.state.questionModes[i] === 'mcq') { const a = this.state.answers[i]; if (a !== null && a >= 0) return a === q.ans; return false; } return null; 
        });
        const fillIndices = []; this.state.questions.forEach((q, i) => { if (this.state.questionModes[i] === 'fill') fillIndices.push(i); });
        document.getElementById('total-grading-count').innerText = fillIndices.length; this.updateGradingUI();
        fillIndices.forEach(i => {
            const q = this.state.questions[i]; const userVal = this.state.answers[i] || ''; const correctVal = q.opts[q.ans];
            const card = document.createElement('div'); card.className = 'bg-card-light p-6 rounded-xl border border-border-light shadow-sm grading-card'; card.id = `grading-card-${i}`;
            card.innerHTML = `<h6 class="text-lg font-bold text-gray-900 mb-4">${i+1}. ${q.q}</h6><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div class="user-answer-box h-full"><small class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Your Answer</small><div class="text-gray-900 font-medium">${userVal || '<em class="text-gray-400">(No Answer)</em>'}</div></div><div class="correct-answer-box h-full"><small class="text-xs font-bold opacity-75 uppercase tracking-wider block mb-1">Correct Answer</small><div class="font-bold text-lg">${correctVal}</div></div></div>${q.note ? `<div class="text-sm bg-blue-50 text-blue-800 p-3 mb-4 rounded-lg">💡 ${q.note}</div>` : ''}<div class="flex gap-3 justify-end pt-2 border-t border-gray-100"><button class="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors flex items-center gap-1" id="btn-grade-wrong-${i}" onclick="app.setGrade(${i}, false)"><span class="material-icons text-sm">close</span> Wrong</button><button class="px-4 py-2 border border-green-300 text-green-600 hover:bg-green-50 rounded-lg font-bold transition-colors flex items-center gap-1" id="btn-grade-correct-${i}" onclick="app.setGrade(${i}, true)"><span class="material-icons text-sm">check</span> Correct</button></div>`;
            list.appendChild(card);
        });
        this.showView('view-grading');
    },
    setGrade(index, isCorrect) {
        this.state.grades[index] = isCorrect;
        const card = document.getElementById(`grading-card-${index}`); const btnW = document.getElementById(`btn-grade-wrong-${index}`); const btnC = document.getElementById(`btn-grade-correct-${index}`);
        card.classList.remove('border-green-300', 'bg-green-50', 'border-red-300', 'bg-red-50');
        if (isCorrect) {
            card.classList.add('border-green-300', 'bg-green-50');
            btnW.className = 'px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors flex items-center gap-1';
            btnC.className = 'px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1';
        } else {
            card.classList.add('border-red-300', 'bg-red-50');
            btnW.className = 'px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1';
            btnC.className = 'px-4 py-2 border border-green-300 text-green-600 hover:bg-green-50 rounded-lg font-bold transition-colors flex items-center gap-1';
        }
        this.updateGradingUI();
    },
    updateGradingUI() {
        const fillIndices = []; this.state.questionModes.forEach((m, i) => { if (m === 'fill') fillIndices.push(i); });
        const gradedCount = fillIndices.filter(i => this.state.grades[i] !== null).length;
        document.getElementById('graded-count').innerText = gradedCount; document.getElementById('btn-finalize-grading').disabled = gradedCount < fillIndices.length;
    },
    finalizeGrading() { this.state._gradingDone = true; this.submitQuiz(); },

    // DASHBOARD REDESIGN (Card vs List View)
    toggleViewMode(mode) { this.state.viewMode = mode; this.renderDashboard(); },
    manageTopic(subId, topId) { this.state.viewMode = 'list'; const sub = Store.data.subjects.find(s=>s.id===subId); const topic = sub.topics.find(t=>t.id===topId); topic.isOpen = true; this.renderDashboard(); },
    
    getSubjectIcon(name) {
        const n = name.toLowerCase();
        if (n.includes('science') || n.includes('chemistry')) return 'science';
        if (n.includes('math')) return 'calculate';
        if (n.includes('history')) return 'history_edu';
        if (n.includes('biology')) return 'biotech';
        if (n.includes('physics')) return 'psychology';
        return 'public'; 
    },

    renderDashboard() {
        const sidebarNav = document.getElementById('sidebar-nav'); const c = document.getElementById('subjects-container');
        sidebarNav.innerHTML = ''; c.innerHTML = ''; let gT=0, gC=0;
        if (!this.activeSidebarSubject && Store.data.subjects.length > 0) this.activeSidebarSubject = Store.data.subjects[0].id;

        Store.data.subjects.forEach(s => {
            const isActive = this.activeSidebarSubject === s.id; const icon = this.getSubjectIcon(s.name);
            const sidebarHtml = `
                <a href="#" onclick="event.preventDefault(); app.setActiveSubject(${s.id})" class="flex items-center justify-between px-3 py-2.5 rounded-lg group transition-colors ${isActive ? 'bg-blue-50 text-primary font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}">
                    <div class="flex items-center gap-3">
                        <span class="material-icons ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary transition-colors'}">${icon}</span>
                        <span class="${isActive ? '' : 'font-medium'}">${s.name}</span>
                    </div>
                    <button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity" onclick="event.stopPropagation(); Store.deleteItem('subject',{subId:${s.id}})" title="Delete Subject">
                        <span class="material-icons text-[16px]">delete</span>
                    </button>
                </a>`;
            sidebarNav.innerHTML += sidebarHtml;
            let sT=0,sC=0; s.topics.forEach(t=>t.subtopics.forEach(st=>{sT+=st.sets.length;sC+=st.sets.filter(x=>x.completed===true).length;})); gT+=sT;gC+=sC;
        });
        
        sidebarNav.innerHTML += `
            <a href="#" onclick="event.preventDefault(); app.showAddSubjectModal()" class="flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors text-gray-500 hover:bg-gray-100 border border-dashed border-gray-300 mt-2">
                <span class="material-icons text-gray-400 group-hover:text-primary transition-colors">add</span>
                <span class="font-medium group-hover:text-primary transition-colors">Add Subject</span>
            </a>
        `;

        this.updateGlobalStats(gC, gT);

        // --- MOST INCORRECT TRACKER ---
        const incorrectPool = Store.getIncorrectPool();
        if (incorrectPool.length > 0) {
            const incorrectSets = [];
            for(let i=0; i<incorrectPool.length; i+=QUESTIONS_PER_SET) { incorrectSets.push(incorrectPool.slice(i, i+QUESTIONS_PER_SET)); }
            
            let incorrectHtml = `
            <div class="bg-red-50 rounded-2xl border border-red-200 mb-8 overflow-hidden shadow-sm">
                <div class="p-5 cursor-pointer flex justify-between items-center" onclick="document.getElementById('incorrect-sets-container').classList.toggle('hidden')">
                    <div class="flex items-center gap-2 text-red-600 font-bold">
                        <span class="material-icons">error</span> Most Incorrect Questions Tracker
                        <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs ml-2">${incorrectPool.length} Total Qs</span>
                    </div>
                    <span class="material-icons text-red-500">expand_more</span>
                </div>
                <div id="incorrect-sets-container" class="hidden bg-white p-5 border-t border-red-100">
                    <p class="text-sm text-gray-500 mb-4">These questions have been answered incorrectly 3 times. Answer them correctly 3 times in review mode to remove them from this list.</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
            incorrectSets.forEach((setQs, idx) => {
                incorrectHtml += `
                    <div class="border border-red-200 rounded-xl p-4 bg-red-50/50 flex flex-col gap-4">
                        <div>
                            <div class="font-bold text-gray-900 mb-1">Incorrect Set ${idx + 1}</div>
                            <span class="bg-white text-gray-500 text-xs px-2 py-1 rounded border border-gray-200">${setQs.length} Questions</span>
                        </div>
                        <button class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm mt-auto shadow-sm" onclick="app.startIncorrectSet(${idx})">
                            Review Set <span class="material-icons text-sm">arrow_forward</span>
                        </button>
                    </div>`;
            });
            incorrectHtml += `</div></div></div>`;
            c.innerHTML += incorrectHtml; 
        }

        if (Store.data.subjects.length === 0) {
            c.innerHTML += `<div class="bg-white rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-12 text-center hover:border-primary cursor-pointer transition-all min-h-[400px]" onclick="app.showAddSubjectModal()"><div class="bg-blue-50 text-primary p-4 rounded-full mb-4"><span class="material-icons text-3xl">add</span></div><h3 class="text-xl font-bold text-gray-900">Add New Subject</h3><p class="text-gray-500 mt-2 max-w-sm mx-auto font-medium">Start by creating a subject library to import questions and organize your topics.</p></div>`; return;
        }

        const activeSub = Store.data.subjects.find(s => s.id === this.activeSidebarSubject) || Store.data.subjects[0];

        const viewTabs = `
            <div class="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm">
                <button class="card-view-btn ${this.state.viewMode === 'card' ? 'active' : 'inactive'}" onclick="app.toggleViewMode('card')">Card View</button>
                <button class="card-view-btn ${this.state.viewMode === 'list' ? 'active' : 'inactive'}" onclick="app.toggleViewMode('list')">List View</button>
            </div>
        `;
        
        let dashboardHtml = `
            <div class="flex flex-col mb-6">
                <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <span>${activeSub.name}</span> <span class="material-icons text-[12px]">chevron_right</span> <span>Dashboard</span>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        ${activeSub.name}
                        <button onclick="app.promptRename('subject',{subId:${activeSub.id}},'${activeSub.name.replace(/'/g,"\\'")}')" class="text-gray-400 hover:text-primary transition-colors"><span class="material-icons text-sm">edit</span></button>
                    </h2>
                    <div class="flex items-center gap-3">
                        ${viewTabs}
                    </div>
                </div>
            </div>
        `;

        if (this.state.viewMode === 'card') {
            let heroTopic = null;
            for (const t of activeSub.topics) { if (Store.isTopperUnlocked(activeSub.id, t.id)) { heroTopic = t; break; } }
            
            if (heroTopic) {
                dashboardHtml += `
                <div class="bg-gradient-to-r from-[#fffbeb] to-[#fef3c7] rounded-2xl p-8 mb-8 border border-yellow-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 pointer-events-none"></div>
                    <div class="relative z-10 max-w-xl">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="bg-yellow-100 text-yellow-800 text-[10px] px-2.5 py-1 rounded-md font-bold flex items-center gap-1 border border-yellow-200 shadow-sm tracking-widest uppercase"><span class="material-icons text-[14px]">emoji_events</span> TOPPER CHALLENGE</span>
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Unlimited Mode</span>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">${heroTopic.name}: Mixed MCQ + Fill-in-the-Blanks</h3>
                        <p class="text-gray-600 mb-6 font-medium text-sm leading-relaxed">Challenge yourself with ${TOPPER_TOTAL_Q} randomized questions (${TOPPER_MCQ_COUNT} MCQ + ${TOPPER_FILL_COUNT} Fill-ups) pulled from all subtopics to test your mastery.</p>
                        <div class="flex items-center gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <span class="flex items-center gap-1"><span class="material-icons text-[16px]">sync</span> ${heroTopic.topperRevisions || 0} Revisions</span>
                            <span class="flex items-center gap-1 text-green-600"><span class="material-icons text-[16px]">check_circle</span> Active: Topper</span>
                        </div>
                    </div>
                    <div class="relative z-10 flex flex-col items-center gap-4">
                        <span class="text-[#d97706] font-bold text-sm tracking-wide">Current Streak: ${Store.data.questionStats ? 'Active' : 'N/A'}</span>
                        <button class="bg-gradient-to-b from-[#f59e0b] to-[#d97706] hover:from-[#fcd34d] hover:to-[#f59e0b] text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 transform hover:-translate-y-0.5 w-full md:w-auto" onclick="app.startTopper(${activeSub.id},${heroTopic.id})">
                            <span class="material-icons">bolt</span> Start Challenge
                        </button>
                    </div>
                </div>`;
            }

            dashboardHtml += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
            
            activeSub.topics.forEach(t => {
                const summary = Store.getTopicSectionSummary(activeSub.id, t.id);
                const activeSec = Store.getTopicActiveSection(activeSub.id, t.id);
                const pct = summary.total > 0 ? Math.round((summary.completed/summary.total)*100) : 0;
                const icon = this.getSubjectIcon(t.name);
                const isMastered = pct === 100;
                
                let badgeHtml = isMastered ? `<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-bold">Active</span>` : `<span class="bg-blue-50 border border-blue-200 text-blue-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">Active: Set ${activeSec}</span>`;
                let revs = t.topperRevisions || 0;
                
                let bubbleHtml = '';
                SECTIONS.forEach(sec => {
                    let bClass = 'inactive'; let num = 0; let iconStr = sec;
                    if (sec === activeSec) { bClass = 'active'; num = summary[sec]; } 
                    else {
                        const secIdx = SECTIONS.indexOf(sec); const actIdx = SECTIONS.indexOf(activeSec);
                        if (actIdx > secIdx || isMastered) { bClass = 'inactive'; } 
                        else { bClass = 'locked'; }
                    }
                    bubbleHtml += `<div class="section-bubble ${bClass}">${iconStr} ${num > 0 && bClass==='active' ? `<span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white">${num}</span>` : ''}</div>`;
                });

                dashboardHtml += `
                <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow relative group overflow-hidden">
                    ${isMastered ? '<div class="absolute top-0 left-0 w-full h-1 bg-green-500"></div>' : ''}
                    <div class="flex justify-between items-start mb-5">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center"><span class="material-icons">${icon}</span></div>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-50" onclick="app.promptRename('topic',{subId:${activeSub.id},topId:${t.id}},'${t.name.replace(/'/g,"\\'")}')"><span class="material-icons text-sm">edit</span></button>
                            <button class="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50" onclick="Store.deleteItem('topic',{subId:${activeSub.id},topId:${t.id}})"><span class="material-icons text-sm">delete</span></button>
                        </div>
                    </div>
                    <h3 class="font-bold text-[19px] text-gray-900 mb-3">${t.name}</h3>
                    <div class="flex gap-2 mb-6">
                        <span class="bg-[#fef3c7] text-[#b45309] text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">${revs} Revs</span>
                        ${badgeHtml}
                    </div>
                    <div class="mb-6 mt-auto">
                        <div class="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            <span>Completion</span><span>${summary.completed} / ${summary.total} Sets</span>
                        </div>
                        <div class="h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner"><div class="h-full ${isMastered ? 'bg-green-500' : 'bg-primary'}" style="width: ${pct}%"></div></div>
                    </div>
                    <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div class="flex gap-1">${bubbleHtml}</div>
                        <button class="text-primary text-sm font-bold flex items-center gap-1 hover:text-blue-700" onclick="app.manageTopic(${activeSub.id}, ${t.id})">Manage <span class="material-icons text-[14px]">arrow_forward</span></button>
                    </div>
                </div>`;
            });

            dashboardHtml += `
                <div class="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 hover:bg-blue-50/30 hover:border-primary hover:text-primary transition-all cursor-pointer group min-h-[250px]" onclick="app.promptAddTopic(${activeSub.id})">
                    <div class="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span class="material-icons text-gray-400 group-hover:text-primary">add</span></div>
                    <h4 class="font-bold text-gray-900 mb-1">Add New Topic</h4>
                    <p class="text-xs font-medium text-gray-500 max-w-[200px]">Import new questions or create a custom set</p>
                </div>
            </div>`; 
        } else {
            dashboardHtml += `<div class="flex gap-3 mb-6"><button class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm font-bold text-sm flex items-center gap-2 hover:bg-gray-50" onclick="app.promptAddTopic(${activeSub.id})"><span class="material-icons text-sm">add</span> Add Topic</button><button class="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm font-bold text-sm flex items-center gap-2 hover:bg-gray-50" onclick="app.openSubjectSettings(${activeSub.id})"><span class="material-icons text-sm">timer</span> Timer</button></div>`;
            
            if (activeSub.topics.length === 0) { dashboardHtml += `<div class="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500 font-medium">No topics yet. Click "Add Topic" above.</div>`; }
            
            activeSub.topics.forEach(t => {
                const top=t.isOpen===true; const shuffleOn=t.shuffleQuestions===true; const topicSummary=Store.getTopicSectionSummary(activeSub.id,t.id);
                const viewSection=t.viewSection||null;
                
                const allActive = viewSection === null;
                let listBubbleHtml = `<div class="flex items-center gap-2 mr-4">`;
                listBubbleHtml += `<div class="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2"><span class="material-icons text-[14px] align-text-bottom">filter_alt</span> Filter:</div>`;
                listBubbleHtml += `<div class="section-bubble ${allActive ? 'active' : 'inactive'} !w-auto !px-3 text-xs" onclick="Store.setTopicViewSection(${activeSub.id},${t.id},'__ALL__')">ALL</div>`;
                SECTIONS.forEach(sec => {
                    const count = topicSummary[sec]; const isViewing = viewSection === sec; const bClass = isViewing ? 'active' : 'inactive';
                    listBubbleHtml += `<div class="section-bubble ${bClass} !w-8 !h-8 text-xs" onclick="Store.setTopicViewSection(${activeSub.id},${t.id},'${sec}')">${sec}${count > 0 && isViewing ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-[16px] h-[16px] rounded-full flex items-center justify-center border-2 border-white">${count}</span>` : ''}</div>`;
                });
                const viewingTopper = viewSection === 'Topper'; const topperUnlocked = Store.isTopperUnlocked(activeSub.id, t.id);
                listBubbleHtml += `<div class="section-bubble ${viewingTopper ? 'active text-white bg-yellow-500' : (topperUnlocked ? 'inactive text-yellow-600 border-yellow-200' : 'locked')} !w-8 !h-8 text-xs" onclick="Store.setTopicViewSection(${activeSub.id},${t.id},'Topper')">🏆</div>`;
                listBubbleHtml += `</div>`;

                let h = `<article class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-4">
                    <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors" onclick="Store.toggleUI({subId:${activeSub.id},topId:${t.id}})">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center"><span class="material-icons">${this.getSubjectIcon(t.name)}</span></div>
                            <div><h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">${t.name}</h3><div class="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">${topicSummary.completed} / ${topicSummary.total} Sets Completed</div></div>
                        </div>
                        <div class="flex gap-2">
                            <button class="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-gray-100" onclick="event.stopPropagation(); app.promptRename('topic',{subId:${activeSub.id},topId:${t.id}},'${t.name.replace(/'/g,"\\'")}')"><span class="material-icons text-sm">edit</span></button>
                            <button class="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100" onclick="event.stopPropagation(); Store.deleteItem('topic',{subId:${activeSub.id},topId:${t.id}})"><span class="material-icons text-sm">delete</span></button>
                            <span class="material-icons text-gray-400 transition-transform ${top ? 'rotate-180' : ''} ml-2 mt-2">expand_more</span>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-100 bg-gray-50/50 ${top?'block':'hidden'} transition-all">
                        <div class="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                            ${listBubbleHtml}
                            <div class="flex items-center gap-2 ml-auto">
                                <button class="btn-shuffle-toggle ${shuffleOn?'shuffle-on':'shuffle-off'}" onclick="Store.toggleShuffleQuestions(${activeSub.id},${t.id})"><span class="material-icons text-[14px]">shuffle</span> ${shuffleOn?'ON':'OFF'}</button>
                                <button class="icon-btn bg-white border border-gray-200 shadow-sm text-primary" ${app.setupTopicImportBtn(activeSub.id,t.id,t.name)} title="Import Questions"><span class="material-icons text-sm">post_add</span></button>
                                <button class="icon-btn bg-white border border-gray-200 shadow-sm text-gray-700" onclick="app.promptAddSubtopic(${activeSub.id},${t.id})" title="Add Subtopic"><span class="material-icons text-sm">add</span></button>
                            </div>
                        </div>`;
                
                const subtopicsSorted=[...t.subtopics].sort((a,b)=>{ const ra=a.sets.reduce((acc,x)=>acc+(x.sectionRevisions||0),0); const rb=b.sets.reduce((acc,x)=>acc+(x.sectionRevisions||0),0); return ra-rb; });
                
                subtopicsSorted.forEach(st=>{
                    const stop=st.isOpen===true; const videoDone=st.videoWatched===true;
                    const subtopicHasMatchingSets=st.sets.some(set=>{
                        if(viewSection===null)return true;
                        if(viewSection==='completed')return set.completed===true;
                        return set.section===viewSection; 
                    });

                    if(viewSection!==null&&!subtopicHasMatchingSets) return;

                    h+=`<div class="tree-item subtopic-row hover:bg-white border-b border-gray-100" onclick="Store.toggleUI({subId:${activeSub.id},topId:${t.id},subtopId:${st.id}})">
                            <div class="flex items-center gap-2"><span class="material-icons text-gray-400 text-sm transition-transform ${stop?'rotate-90 text-primary':''}">chevron_right</span><span class="font-bold text-gray-800">${st.name}</span></div>
                            <div class="flex items-center gap-2" onclick="event.stopPropagation()">
                                <button class="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${videoDone?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}" onclick="Store.toggleVideoStatus(${activeSub.id},${t.id},${st.id})"><span class="material-icons text-[14px]">${videoDone?'check_circle':'play_circle'}</span> ${videoDone?'Watched':'Video'}</button>
                                <div class="w-px h-4 bg-gray-300 mx-1"></div>
                                <button class="text-gray-400 hover:text-primary transition-colors p-1" ${app.setupImportBtn(activeSub.id,t.id,st.id,st.name)}><span class="material-icons text-sm">upload_file</span></button>
                                <button class="text-gray-400 hover:text-primary transition-colors p-1" onclick="app.promptRename('subtopic',{subId:${activeSub.id},topId:${t.id},subtopId:${st.id}},'${st.name.replace(/'/g,"\\'")}')"><span class="material-icons text-sm">edit</span></button>
                                <button class="text-gray-400 hover:text-red-500 transition-colors p-1" onclick="Store.deleteItem('subtopic',{subId:${activeSub.id},topId:${t.id},subtopId:${st.id}})"><span class="material-icons text-sm">delete</span></button>
                            </div>
                          </div>
                          <div class="set-container ${stop?'':'hidden'}">`;
                    
                    st.sets.forEach((set,idx)=>{
                        if (viewSection !== null && viewSection !== 'completed' && set.section !== viewSection) return;
                        if (viewSection === 'completed' && !set.completed) return;

                        const qCount=set.questions?.length||0; const isCompleted = set.completed;
                        const sectionRevisions = set.sectionRevisions || 0;
                        
                        let revDotsHtml = `<div class="revision-dots" title="Revisions: ${sectionRevisions}/${REVISIONS_TO_PROMOTE}">`;
                        for(let rd=0;rd<REVISIONS_TO_PROMOTE;rd++){ revDotsHtml+=`<div class="rev-dot ${rd<sectionRevisions?'filled':''}"></div>`; }
                        revDotsHtml += `</div>`;

                        let canStart = videoDone && Store.canPracticeSet(activeSub.id, t.id, set);

                        h+=`<div class="set-item ${isCompleted ? 'completed border-green-200' : ''}">
                                <div class="flex items-center gap-3 flex-grow min-w-0">
                                    <span class="material-icons ${isCompleted ? 'text-green-500' : 'text-gray-400'} flex-shrink-0">${isCompleted ? 'check_circle' : 'description'}</span>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2 truncate">
                                            <span class="font-bold text-gray-900 truncate">${set.name}</span> 
                                            <span class="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest flex-shrink-0">${qCount} Q</span> 
                                            ${isCompleted ? '<span class="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest flex-shrink-0">Completed</span>' : `<span class="section-badge section-badge-${set.section||'A'} flex-shrink-0">Sec ${set.section||'A'}</span>`}
                                            ${!isCompleted ? revDotsHtml : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex gap-2 flex-shrink-0">
                                    ${!isCompleted ? `<button class="px-5 py-2 rounded-lg text-sm font-bold transition-colors ${canStart ? 'bg-primary hover:bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}" onclick="${canStart ? `app.startSet(${activeSub.id},${t.id},${st.id},${idx})` : `alert('Watch the video and complete previous sections to unlock!')`}">${canStart ? 'Start' : 'Locked'}</button>` : ''}
                                    <button class="icon-btn bg-white border border-gray-200" onclick="app.openSetEditor(${activeSub.id},${t.id},${st.id},${idx})"><span class="material-icons text-sm">edit_note</span></button>
                                    <button class="icon-btn delete bg-white border border-gray-200" onclick="Store.deleteItem('set',{subId:${activeSub.id},topId:${t.id},subtopId:${st.id},setIndex:${idx}})"><span class="material-icons text-sm">delete</span></button>
                                </div>
                              </div>`;
                    });
                    if(st.sets.length===0) h+=`<div class="text-sm text-gray-500 italic p-2 font-medium">No sets added yet.</div>`;
                    h+=`</div>`;
                });

                if ((viewSection === null || viewSection === 'Topper') && Store.isTopperUnlocked(activeSub.id, t.id)) {
                     h += `<div class="p-4 border-t border-gray-200 bg-gradient-to-r from-yellow-50 to-white flex justify-between items-center">
                        <div class="flex items-center gap-2 text-yellow-800 font-bold text-sm uppercase tracking-wider">
                            <span class="material-icons">emoji_events</span> Topper (Unlimited)
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="bg-white text-yellow-700 font-bold border border-yellow-200 px-3 py-1 rounded shadow-sm text-xs">🏆 ${t.topperRevisions || 0} Revs</span>
                            <button class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1.5 px-4 rounded transition-colors text-sm shadow-sm" onclick="app.startTopper(${activeSub.id},${t.id})">
                                Practice Topper
                            </button>
                        </div>
                    </div>`;
                }

                h+=`</div></article>`; dashboardHtml+=h;
            });
        }
        c.innerHTML += dashboardHtml;
    },
    
    setActiveSubject(subId) { this.activeSidebarSubject = subId; this.renderDashboard(); },
    updateGlobalStats(completedSets, totalSets) {
        const pct = totalSets > 0 ? Math.round((completedSets/totalSets)*100) : 0;
        document.getElementById('global-progress-bar').style.width = pct + "%";
        document.getElementById('daily-goal-text').innerText = pct + "%"; 

        const completedQCount=Store.getCompletedQuestionsCount();
        const mockStatus=document.getElementById('mock-exam-status-badge');
        if(completedQCount>=MIN_QUESTIONS_FOR_MOCK) {
            mockStatus.className = 'hidden md:flex items-center gap-2 bg-[#fef3c7] text-[#b45309] px-3 py-1.5 rounded-md text-xs font-bold border border-yellow-200 shadow-sm';
            mockStatus.innerHTML = `<span class="material-icons text-[14px]">lock_open</span><span>Mock Exam: Ready</span>`;
        } else {
            const needed = MIN_QUESTIONS_FOR_MOCK - completedQCount;
            mockStatus.className = 'hidden md:flex items-center gap-2 bg-[#fef3c7] text-[#b45309] px-3 py-1.5 rounded-md text-xs font-bold border border-yellow-200 shadow-sm opacity-75';
            mockStatus.innerHTML = `<span class="material-icons text-[14px]">lock</span><span>Mock Exam: ${completedQCount}/${MIN_QUESTIONS_FOR_MOCK}. Need ${needed} more.</span>`;
        }
    },

    promptAddTopic(sid){const n=prompt("Topic:");if(n){ Store.addTopic(sid,n); this.renderDashboard(); }},
    promptAddSubtopic(sid,tid){const n=prompt("Subtopic:");if(n){ Store.addSubtopic(sid,tid,n); this.renderDashboard(); }},
    promptRename(type,ids,oldName){const n=prompt("Rename to:",oldName);if(n){ Store.renameItem(type,ids,n); this.renderDashboard(); }},
    exportData(){const a=document.createElement('a');a.href='data:json;charset=utf-8,'+encodeURIComponent(JSON.stringify(Store.data));a.download='mcq-backup.json';a.click();},
    importBackup(inp){const f=inp.files[0];if(f){const r=new FileReader();r.onload=e=>{try{Store.data=JSON.parse(e.target.result);Store.save();location.reload();}catch(e){alert("Invalid file");}};r.readAsText(f);}},
    resetData(){if(confirm("Reset all data?")){localStorage.removeItem('quizApp_v36');location.reload();}},
    markCurrentSetComplete(){ const{subId,topId,subtopId,setIndex}=this.state.path; const set=Store.data.subjects.find(s=>s.id===subId).topics.find(t=>t.id===topId).subtopics.find(st=>st.id===subtopId).sets[setIndex]; set.completed=true;Store.save();this.showDashboard(); },
    
    // Editor Core
    openSetEditor(subId,topId,subtopId,setIndex){const set=Store.getSet(subId,topId,subtopId,setIndex);this.editor.qs=JSON.parse(JSON.stringify(set.questions));this.editor.path={subId,topId,subtopId,setIndex};document.getElementById('editor-title').innerText=`Edit: ${set.name}`;this.renderEditor();this.showView('view-editor');},
    renderEditor(){
        const c=document.getElementById('editor-questions-container');c.innerHTML='';
        this.editor.qs.forEach((q,i)=>{
            c.innerHTML+=`<div class="bg-card-light p-6 rounded-2xl border border-border-light shadow-sm relative"><div class="flex justify-between items-center mb-4"><span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-bold border border-gray-200">Q${i+1}</span><button class="text-red-500 hover:text-red-700 p-1" onclick="app.removeQ(${i})" title="Delete Question"><span class="material-icons text-sm">delete</span></button></div><textarea class="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 mb-4 focus:ring-2 focus:ring-primary focus:border-primary font-medium" rows="2" onchange="app.editQ(${i},'q',this.value)">${q.q}</textarea><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">${q.opts.map((o,k)=>`<div class="flex items-center gap-2"><span class="font-bold text-gray-400 w-5">${String.fromCharCode(65+k)})</span><input class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary font-medium" value="${o}" onchange="app.editOpt(${i},${k},this.value)"></div>`).join('')}</div><div class="flex flex-col md:flex-row gap-4 pt-4 border-t border-gray-100"><div class="w-full md:w-1/3"><label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Correct Answer</label><select class="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary font-medium" onchange="app.editQ(${i},'ans',this.value)">${[0,1,2,3].map(x=>`<option value="${x}" ${q.ans==x?'selected':''}>Option ${String.fromCharCode(65+x)}</option>`).join('')}</select></div><div class="w-full md:w-2/3"><label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note / Explanation</label><input class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary font-medium" value="${q.note||''}" placeholder="Optional explanation..." onchange="app.editQ(${i},'note',this.value)"></div></div></div>`;
        });
    },
    addBlankQ() { this.editor.qs.push({ id: 'q_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36), q: "New Question", opts: ["Option A", "Option B", "Option C", "Option D"], ans: 0, note: "" }); this.renderEditor(); setTimeout(() => { window.scrollTo(0, document.body.scrollHeight); }, 100); },
    editQ(i,f,v){if(f==='ans')v=parseInt(v);this.editor.qs[i][f]=v;}, editOpt(i,k,v){this.editor.qs[i].opts[k]=v;}, removeQ(i){this.editor.qs.splice(i,1);this.renderEditor();}, saveSetChanges(){Store.updateSetQuestions(this.editor.path,this.editor.qs);this.showDashboard();}
};

app.init();
