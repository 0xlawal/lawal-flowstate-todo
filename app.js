(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const key = "flowstate.tasks.v1", now = new Date();
  now.setHours(0, 0, 0, 0);
  // Use local calendar dates; toISOString() can shift the day in UTC+ zones.
  const dateKey = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
  const today = dateKey(now);
  const seed = [
    {id:"a",title:"Review lecture notes",notes:"Go over the key concepts from this week's class.",list:"Personal",priority:"medium",due:today,done:false,created:4},
    {id:"b",title:"Send project update to the team",notes:"Share the latest progress and next steps.",list:"Work",priority:"high",due:today,done:false,created:3},
    {id:"c",title:"Read 10 pages of a book",notes:"A little time away from the screen.",list:"Personal",priority:"low",due:"",done:true,created:2},
    {id:"d",title:"Capture ideas for the weekend",notes:"",list:"Ideas",priority:"low",due:"",done:false,created:1}
  ];
  let tasks;
  try { tasks = JSON.parse(localStorage.getItem(key)) || seed; } catch { tasks = seed; }
  let view = "today", filter = "all", priority = "", editing = null, timer;
  const esc = s => String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const isToday = t => t.due === today;
  const dueLabel = d => {
    if (!d) return "";
    if (d === today) return "Today";
    const n = new Date(now); n.setDate(n.getDate() + 1);
    if (d === n.toISOString().slice(0,10)) return "Tomorrow";
    return new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(new Date(d+"T00:00:00"));
  };
  const save = () => localStorage.setItem(key, JSON.stringify(tasks));
  function visible() {
    const q = $("#query").value.trim().toLowerCase();
    return tasks.filter(t =>
      (view === "all" || (view === "today" && (isToday(t) || (!t.due && !t.done))) ||
       (view === "upcoming" && t.due > today) || (view.startsWith("list:") && t.list === view.slice(5))) &&
      (filter === "all" || (filter === "active" && !t.done) || (filter === "completed" && t.done)) &&
      (!priority || t.priority === priority) &&
      (!q || (t.title+" "+t.notes+" "+t.list).toLowerCase().includes(q))
    ).sort((a,b) => Number(a.done)-Number(b.done) || (a.due||"9999").localeCompare(b.due||"9999") ||
      ({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority]) || b.created-a.created);
  }
  function render() {
    const done = tasks.filter(t=>t.done).length, total = tasks.length, open = total-done, pct = total ? Math.round(done/total*100) : 0;
    $("#todayCount").textContent = tasks.filter(t=>isToday(t)&&!t.done).length;
    $("#allCount").textContent = total; $("#open").textContent = open; $("#done").textContent = done;
    $("#percent").textContent = pct+"%"; $("#ring").style.strokeDashoffset = 264-264*pct/100;
    $("#progressTitle").textContent = pct===100&&total ? "Beautifully done." : done ? "You're building momentum" : "You're just getting started";
    $("#progressSub").textContent = total ? done+" of "+total+" tasks completed" : "Every task is a step forward.";
    const labels = {today:["Today","Today's focus","Make space for what matters most."],upcoming:["Upcoming","Coming up","A little planning goes a long way."],all:["All tasks","Everything on your list","The big picture, all in one place."]};
    const c = view.startsWith("list:") ? [view.slice(5),view.slice(5),"Your "+view.slice(5).toLowerCase()+" list."] : labels[view];
    $("#crumb").textContent=c[0]; $("#heading").innerHTML=esc(c[1])+' <small>'+visible().length+"</small>";
    $("#hint").textContent=c[2]; $("#greeting").innerHTML=(view==="today"?"Good evening, Lawal":esc(c[0]))+'<span class="green">.</span>';
    $("#sub").textContent=view==="today"?"A clear mind starts with a clear plan.":c[2];
    const list=visible(); $("#tasks").innerHTML="";
    list.forEach((t,i)=>{
      const row=document.createElement("article"); row.className="task"+(t.done?" completed":""); row.dataset.id=t.id;
      row.style.setProperty("--delay",Math.min(i*55,330)+"ms");
      const due=t.due?'<span class="due '+(!t.done&&t.due<today?"overdue":"")+'">'+dueLabel(t.due)+"</span>":"";
      row.innerHTML='<button class="check" aria-label="'+(t.done?"Mark incomplete":"Complete task")+'" aria-pressed="'+t.done+'">âœ“</button><div class="task-copy"><div class="task-title">'+esc(t.title)+'</div>'+(t.notes?'<div class="task-note">'+esc(t.notes)+"</div>":"")+'</div><div class="meta"><span class="priority '+t.priority+'">'+t.priority+'</span><span class="list-name">'+esc(t.list)+"</span>"+due+'<div class="actions"><button class="edit" aria-label="Edit task" title="Edit">âœŽ</button><button class="delete" aria-label="Delete task" title="Delete">Ã—</button></div></div>';
      $("#tasks").append(row);
    });
    const empty=!list.length; $("#empty").hidden=!empty; $("#tasks").hidden=empty;
    $("#clear").style.visibility=done?"visible":"hidden";
    $("#empty h3").textContent=filter==="completed"?"No completed tasks yet.":"A little room to breathe.";
    $("#empty p").textContent=filter==="completed"?"Your finished tasks will find a home here.":"Nothing on this view just yet. Add a task and make it yours.";
  }
  function toast(msg) {
    const el=$("#toast"); el.textContent=msg; el.classList.add("show");
    clearTimeout(timer); timer=setTimeout(()=>el.classList.remove("show"),2200);
  }
  function openModal(id) {
    editing=id||null; const t=tasks.find(x=>x.id===id); $("#form").reset();
    $("#priority").value=t?t.priority:"medium"; $("#list").value=t?t.list:(view.startsWith("list:")?view.slice(5):"Personal");
    $("#title").value=t?t.title:""; $("#notes").value=t?(t.notes||""):""; $("#due").value=t?(t.due||""):"";
    $("#modalTitle").innerHTML=(t?"Edit your task":"A new task")+'<span>.</span>';
    $("#submit").textContent=t?"Save changes":"Add task"; $("#due").min=today;
    $("#modal").showModal(); requestAnimationFrame(()=>$("#title").focus());
  }
  function celebrate(row) {
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const r=row.getBoundingClientRect(), colors=["#6ba77b","#d9ad65","#8d9fd0","#c6a7d8"];
    for(let i=0;i<13;i++){
      const b=document.createElement("i"); b.className="confetti"; b.style.left=r.left+26+"px"; b.style.top=r.top+r.height/2+"px";
      b.style.setProperty("--dx",(Math.random()*100-50)+"px"); b.style.setProperty("--dy",(Math.random()*-75-15)+"px");
      b.style.setProperty("--rot",(Math.random()*540-270)+"deg"); b.style.setProperty("--color",colors[i%4]);
      document.body.append(b); b.addEventListener("animationend",()=>b.remove());
    }
  }
  $("#tasks").addEventListener("click",e=>{
    const row=e.target.closest(".task"); if(!row)return;
    const id=row.dataset.id,t=tasks.find(x=>x.id===id);
    if(e.target.closest(".check")){t.done=!t.done;row.classList.toggle("completed",t.done);row.classList.add("completing");if(t.done)celebrate(row);save();setTimeout(render,260);toast(t.done?"A little win. Nicely done!":"Task moved back to your list.");}
    if(e.target.closest(".edit"))openModal(id);
    if(e.target.closest(".delete")){row.classList.add("removing");setTimeout(()=>{tasks=tasks.filter(x=>x.id!==id);save();render();toast("Task removed.");},270);}
  });
  $("#form").addEventListener("submit",e=>{
    e.preventDefault();const title=$("#title").value.trim();if(!title)return;
    const data={title,notes:$("#notes").value.trim(),list:$("#list").value,priority:$("#priority").value,due:$("#due").value};
    if(editing){Object.assign(tasks.find(t=>t.id===editing),data);toast("Your changes are saved.");}
    else{tasks.unshift({id:crypto.randomUUID(),...data,done:false,created:Date.now()});toast("Task added. You've got this.");}
    save();$("#modal").close();render();
  });
  $("#add").onclick=()=>openModal();$("#emptyAdd").onclick=()=>openModal();
  $("#close").onclick=$("#cancel").onclick=()=>$("#modal").close();
  $("#filterBtn").onclick=()=>$("#filters").hidden=!$("#filters").hidden;
  $$("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;$$("[data-filter]").forEach(x=>x.classList.toggle("chosen",x===b));render();});
  $$("[data-priority]").forEach(b=>b.onclick=()=>{priority=priority===b.dataset.priority?"":b.dataset.priority;$$("[data-priority]").forEach(x=>x.classList.toggle("selected",x.dataset.priority===priority));render();});
  $("#searchBtn").onclick=()=>{$("#search").classList.add("open");$("#query").focus();};
  $("#closeSearch").onclick=()=>{$("#search").classList.remove("open");$("#query").value="";render();};
  $("#query").oninput=render;
  $$("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;$$("[data-view]").forEach(x=>x.classList.toggle("active",x===b));$$("[data-list]").forEach(x=>x.classList.remove("active"));render();});
  $$("[data-list]").forEach(b=>b.onclick=()=>{view="list:"+b.dataset.list;$$("[data-list]").forEach(x=>x.classList.toggle("active",x===b));$$("[data-view]").forEach(x=>x.classList.remove("active"));render();});
  $("#clear").onclick=()=>{tasks=tasks.filter(t=>!t.done);save();render();toast("Completed tasks cleared.");};
  $("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("flowstate.theme",document.body.classList.contains("dark")?"dark":"light");};
  if(localStorage.getItem("flowstate.theme")==="dark")document.body.classList.add("dark");
  document.addEventListener("keydown",e=>{
    if((e.key==="n"||e.key==="N")&&!$("#modal").open&&!/input|textarea/i.test(document.activeElement.tagName)){e.preventDefault();openModal();}
    if(e.key==="/"&&!$("#modal").open&&!/input|textarea/i.test(document.activeElement.tagName)){e.preventDefault();$("#search").classList.add("open");$("#query").focus();}
  });
  $("#date").textContent=new Intl.DateTimeFormat("en",{weekday:"long",month:"long",day:"numeric"}).format(now).toUpperCase();
  render();
})();

