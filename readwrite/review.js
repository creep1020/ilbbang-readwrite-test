/* 읽기·쓰기 복습 v4: 프로필별 기기 저장. 기존 캐릭터/별/Firebase 코드는 변경하지 않음. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const date=(add=0)=>{let d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+add);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const context=()=>window.rwReviewGetContext?.()||{profileId:'',person:'jiwoo',day:1};
const key=()=>`rwReviewsV4:${encodeURIComponent(context().profileId||'unselected')}`;
const blank=()=>({writing:{},expressions:{},daily:{},reads:{},seen:{}});
let bank=[],filter='today',showKorean=false,speaking=null;
function read(){try{let d=JSON.parse(localStorage.getItem(key())||'null');return d&&typeof d==='object'?Object.assign(blank(),d):blank();}catch(e){return blank();}}
function save(d){try{localStorage.setItem(key(),JSON.stringify(d));return true;}catch(e){$('rwReviewStorageMsg').textContent='저장할 수 없어요. 기기 저장 공간을 확인해 주세요.';return false;}}
function item(kind,day,index){const l=window.rwReviewGetLessons?.()?.[day-1];const row=kind==='writing'?l?.ws?.[index]:l?.vocab?.[index];return row?{day,index,question:row[0],answer:row[1]}:null;}
const intervals=[1,3,7,14,30];
function personText(s){return String(s).replaceAll('{name}',context().person==='minseo'?'Minseo':'Jiwoo').replaceAll('{koName}',context().person==='minseo'?'민서':'지우').replaceAll('Jiwoo',context().person==='minseo'?'Minseo':'Jiwoo').replaceAll('지우',context().person==='minseo'?'민서':'지우');}
function entries(d){return [...Object.entries(d.writing).map(([k,v])=>({...v,kind:'writing',id:k})),...Object.entries(d.expressions).map(([k,v])=>({...v,kind:'expressions',id:k}))].filter(v=>v.question&&v.answer);}
function grade(kind,day,index,choice){if(!context().profileId)return;const d=read(),bucket=kind==='writing'?d.writing:d.expressions,k=`${day}:${index}`,source=item(kind,day,index);if(!source)return;
 if(choice==='wrong'){bucket[k]={...source,step:0,next:date(1)};}
 else if(bucket[k]){const nextStep=(bucket[k].step||0)+1;if(nextStep>=5)delete bucket[k];else bucket[k]={...bucket[k],step:nextStep,next:date(intervals[Math.min(4,nextStep)])};}
 if(save(d)){$('rwReviewMarkMsg').textContent=choice==='wrong'?'저장했어요. 내일부터 복습에 나와요.':'확인했어요. 다음 복습일을 조정했어요.';}
 updateStatus();renderCards();
}
function updateStatus(){const d=read(),cards=entries(d),due=cards.filter(x=>!x.next||x.next<=date());$('rwReviewTotal').textContent=`등록 ${cards.length}개 · 오늘 ${due.length}개`;
 document.querySelectorAll('[data-rw-mark-w]').forEach(b=>{if(b.dataset.rwMarkAction==='wrong')b.textContent=d.writing[`${context().day}:${b.dataset.rwMarkW}`]?'🔁 오답 저장됨':'🔁 다시 복습';});
 document.querySelectorAll('[data-rw-difficult]').forEach(b=>{b.textContent=d.expressions[`${context().day}:${b.dataset.rwDifficult}`]?'✓ 어려움 저장됨':'🔖 어려워요';});}
function stopAudio(){try{speechSynthesis.cancel();}catch(e){}if(speaking){speaking.textContent='🔊 듣기';speaking=null;}}
function talk(s,b){if(!('speechSynthesis' in window))return alert('이 기기는 듣기를 지원하지 않아요.');if(speaking===b){stopAudio();return;}stopAudio();let u=new SpeechSynthesisUtterance(s);u.lang='en-US';u.rate=.7;speaking=b;b.textContent='■ 중지';u.onend=u.onerror=()=>{if(speaking===b){b.textContent='🔊 듣기';speaking=null;}};speechSynthesis.speak(u);}
function eligible(){const id=context().profileId;if(!id)return[];return bank.filter(s=>s.book===1&&s.verified&&!!safeGet(`rwCompletedV1:${id}:${s.day}`));}
function safeGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function pick(){const candidates=eligible();if(!candidates.length)return null;const d=read(),t=date(),saved=d.daily[t];if(saved&&candidates.some(s=>s.id===saved))return candidates.find(s=>s.id===saved);
 const prev=d.daily[date(-1)];const options=candidates.length>1?candidates.filter(s=>s.id!==prev):candidates;const min=Math.min(...options.map(s=>d.seen[s.id]||0));const least=options.filter(s=>(d.seen[s.id]||0)===min);const found=least[Math.floor(Math.random()*least.length)];d.daily[t]=found.id;d.seen[found.id]=(d.seen[found.id]||0)+1;save(d);return found;}
function story(){const el=$('rwRandomStory');if(!context().profileId){el.innerHTML='<p class="rw-muted">먼저 학습 프로필을 선택해 주세요.</p>';return;}
 if(!bank.length){el.innerHTML='<p class="rw-muted">이야기를 불러오는 중이에요.</p>';return;}
 const allowed=eligible();$('rwRandomIntro').textContent=`전체 150편 중 검수 완료 2편 · 현재 열림 ${allowed.length}편`;
 const s=pick();if(!s){el.innerHTML='<div class="rw-note">DAY 1~2 중 학습을 완료한 DAY의 복습 이야기만 열려요. 정규학습에서 ‘오늘 학습 완료하기’를 먼저 눌러 주세요.</div>';return;}
 const readDone=read().reads[date()]===s.id;
 el.innerHTML=`<div class="rw-review-story-head"><div><span class="rw-review-status">1권 DAY ${s.day}</span><h3>${esc(s.title)}</h3><p class="rw-muted">${esc(s.titleKo)}</p></div><label class="rw-check"><input id="rwRandomShowKo" type="checkbox" ${showKorean?'checked':''}>해석 보기</label></div>`+
 s.sentences.map((pair,i)=>`<div class="rw-review-story-line"><b>${i+1}. ${esc(personText(pair[0]))}</b><p class="rw-ko" ${showKorean?'':'hidden'}>${esc(personText(pair[1]))}</p><button class="rw-small" type="button" data-rw-voice="${i}">🔊 듣기</button></div>`).join('')+
 `<div class="rw-review-actions"><button id="rwRandomDone" class="rw-done" type="button">${readDone?'✓ 오늘 읽기 완료':'✓ 오늘 이야기 읽었어요'}</button><span class="rw-muted" id="rwRandomDoneMsg"></span></div>`;
 $('rwRandomShowKo').onchange=e=>{showKorean=e.target.checked;el.querySelectorAll('.rw-review-story-line>.rw-ko').forEach(x=>x.hidden=!showKorean);};
 el.querySelectorAll('[data-rw-voice]').forEach(b=>b.onclick=()=>talk(personText(s.sentences[Number(b.dataset.rwVoice)][0]),b));
 $('rwRandomDone').onclick=()=>{let d=read();d.reads[date()]=s.id;if(save(d)){$('rwRandomDone').textContent='✓ 오늘 읽기 완료';$('rwRandomDoneMsg').textContent='이 프로필에 저장했어요.';}};
}
function reviewCard(d,v){const bucket=v.kind==='writing'?d.writing:d.expressions;return bucket[v.id];}
function renderCards(){const el=$('rwReviewCards');if(!context().profileId){el.innerHTML='<p class="rw-muted">먼저 학습 프로필을 선택해 주세요.</p>';return;}
 const d=read(),list=entries(d).sort((a,b)=>(a.next||'').localeCompare(b.next||'')),show=filter==='today'?list.filter(v=>!v.next||v.next<=date()):list;
 $('rwReviewDue').classList.toggle('rw-tab-active',filter==='today');$('rwReviewAll').classList.toggle('rw-tab-active',filter==='all');
 if(!show.length){el.innerHTML='<div class="rw-note">'+(list.length?'오늘 복습할 카드는 없어요. 「전체 카드」에서 미리 볼 수 있어요.':'DAY 영작에서 틀린 문제를 표시하거나 새 표현에서 「어려워요」를 눌러 복습 목록을 만드세요.')+'</div>';return;}
 el.innerHTML=show.map((v,i)=>`<article class="rw-review-card"><div class="rw-review-card-top"><b>${v.kind==='writing'?'✏️ 영작 오답':'🔖 어려운 표현'} · DAY ${v.day}</b><span class="rw-muted">${v.next>date()?'다음 '+v.next:'오늘 복습'}</span></div><p class="rw-review-prompt">${esc(personText(v.question))}</p><div class="rw-review-reveal" hidden>${esc(personText(v.answer))}</div><button class="rw-small" type="button" data-reveal="${i}">정답 보기</button> <button class="rw-small" type="button" data-right="${i}">✅ 맞혔어요</button> <button class="rw-small" type="button" data-again="${i}">🔁 다시 복습</button></article>`).join('');
 show.forEach((v,i)=>{const card=el.children[i],ans=card.querySelector('.rw-review-reveal');card.querySelector('[data-reveal]').onclick=e=>{ans.hidden=!ans.hidden;e.currentTarget.textContent=ans.hidden?'정답 보기':'정답 숨기기';};
  function next(right){const data=read(),b=v.kind==='writing'?data.writing:data.expressions,old=b[v.id];if(!old)return;
   if(right){const n=(Number(old.step)||0)+1;if(n>=5)delete b[v.id];else b[v.id]={...old,step:n,next:date(intervals[Math.min(n,4)])};}
   else b[v.id]={...old,step:0,next:date(1)};
   if(save(data)){updateStatus();renderCards();}
  }
  card.querySelector('[data-right]').onclick=()=>next(true);card.querySelector('[data-again]').onclick=()=>next(false);
 });
}
function refresh(){stopAudio();updateStatus();story();renderCards();}
window.rwReviewEngine={mark:(kind,day,index,action)=>grade(kind,day,index,action),refresh,diagnostics:()=>({stories:bank.length,verified:bank.filter(s=>s.verified).length,profile:context().profileId})};
$('rwReviewDue').onclick=()=>{filter='today';renderCards();};$('rwReviewAll').onclick=()=>{filter='all';renderCards();};
window.addEventListener('rw:profile',refresh);window.addEventListener('rw:lesson',refresh);
window.addEventListener('storage',e=>{if(e.key?.startsWith('rwReviewsV4:')||e.key?.startsWith('rwCompletedV1:'))refresh();});
fetch('./readwrite/review-stories.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(d=>{
 if(d.total!==150||d.stories?.length!==150||d.stories.some(s=>s.sentences?.length!==5))throw Error('이야기 150편 검사 실패');bank=d.stories;refresh();
}).catch(e=>{$('rwRandomStory').innerHTML='<p class="rw-error">이야기를 열지 못했어요. readwrite/review-stories.json 파일을 확인해 주세요. ('+esc(e.message)+')</p>';});
refresh();
})();
