/* global browser */

const manifest = browser.runtime.getManifest();
const extname = manifest.name;
let singleActionMode = false;
let singleActionAction = '';
let disableNotifications = false;

const mfest = browser.runtime.getManifest();

async function getFromStorage(type, id, fallback) {
    let tmp = await browser.storage.local.get(id);
    return (typeof tmp[id] === type) ? tmp[id] : fallback;
}

async function setToStorage(id, value) {
    let obj = {};
    obj[id] = value
    return browser.storage.local.set(obj);
}

function notify(title, message = "", iconUrl = "icon.png") {
	if(!disableNotifications) {
	    return browser.notifications.create(""+Date.now(),
		{
		   "type": "basic"
		    ,iconUrl
		    ,title
		    ,message
		}
	    );
	}
}


function getTimeStampStr() {
    const d = new Date();
    let ts = "";
    [   d.getFullYear(), d.getMonth()+1, d.getDate()+1,
        d.getHours(), d.getMinutes(), d.getSeconds()].forEach( (t,i) => {
        ts = ts + ((i!==3)?"-":"_") + ((t<10)?"0":"") + t;
    });
    return ts.substring(1);
}

async function copyTabsAsText(tabs){
        const text = tabs.map( t => t.url ).join('\n') + '\n';
	try {
		await navigator.clipboard.writeText(text);
		return true;
	}catch(e){
		console.error(e);
	}
	return false;
}

async function saveTabsAsText(tabs){
        const text = tabs.map( t => t.url ).join('\n') + '\n';
	try {
		let link = document.createElement('a');
		link.style.display = 'none';
		const href = 'data:plain/text;charset=utf-8,' + encodeURIComponent(text);
		link.setAttribute('href', href);
		link.setAttribute('target','_blank');
		link.setAttribute('download', getTimeStampStr() + ' ' + extname + '.txt');
		document.body.append(link);
		link.click();
		setTimeout(()=>{link.remove()},3000);
		return true;
	}catch(e){
		console.error(e);
	}
	return false;
}

async function saveTabsAsHtml(tabs){
	try {
            let div = document.createElement('div');
	    div.style.position = 'absolute';
	    div.style.bottom = '-9999999';  // move it offscreen 
	    document.body.append(div);

            for(const t of tabs) {
                let br = document.createElement('br');
                let a = document.createElement('a');
                a.href = t.url;
                a.textContent = t.title;
                div.append(a);
                div.append(br);
            }
	    const text = div.innerHTML;
	    let link = document.createElement('a');
	    link.style.display = 'none';
	    const href = 'data:text/html;charset=utf-8,' + encodeURIComponent(text);
	    link.setAttribute('href', href);
	    link.setAttribute('target','_blank');
	    link.setAttribute('download', getTimeStampStr() + ' ' + extname + '.txt');
	    document.body.append(link);
	    link.click();
	    setTimeout(()=>{link.remove()},3000);
            div.remove();
	    return true;
	}catch(e){
		console.error(e);
	}
	return false;
}

async function copyTabsAsHtml(tabs){
	try {
            let div = document.createElement('div');
	    div.style.position = 'absolute';
	    div.style.bottom = '-9999999';  // move it offscreen 
	    document.body.append(div);
            for(const t of tabs) {
                let br = document.createElement('br');
                let a = document.createElement('a');
                a.href = t.url;
                a.textContent = t.title;
                div.append(a);
                div.append(br);
            }
            div.focus();
            document.getSelection().removeAllRanges();
            var range = document.createRange();
            range.selectNode(div);
            document.getSelection().addRange(range);
            document.execCommand("copy");
            div.remove();
	    return true;
	}catch(e){
	    console.error(e);
	}
	return false;
}

async function onCommand(cmd) {
	let qryObj, tabs, ret = false;
	// action  cpy|sav
	// amount  sel|all
	// output  txt|htm
	switch(cmd){
		case 'cpyallhtm':
			qryObj = {
			    hidden:false,
			    currentWindow:true
			};
			tabs  = await browser.tabs.query(qryObj);
			ret = copyTabsAsHtml(tabs);
			break;
		case 'cpyalltxt':
			qryObj = {
			    hidden:false,
			    currentWindow:true
			};
			tabs  = await browser.tabs.query(qryObj);
			ret = copyTabsAsText(tabs);
			break;
		case 'cpyselhtm':
			qryObj = {
			    highlighted: true,
			    hidden:false,
			    currentWindow:true
			};
			tabs  = await browser.tabs.query(qryObj);
			ret = copyTabsAsHtml(tabs);
			break;
		case 'cpyseltxt':
			qryObj = {
			    highlighted: true,
			    hidden:false,
			    currentWindow:true
			};
			tabs  = await browser.tabs.query(qryObj);
			ret = copyTabsAsText(tabs);
			break;
		case 'savalltxt':
			qryObj = {
			    hidden:false,
			    currentWindow:true
			};
			tabs  = await browser.tabs.query(qryObj);
			ret = saveTabsAsText(tabs);
			break;
		case 'savseltxt':
			qryObj = {
			    highlighted: true,
			    hidden:false,
			    currentWindow:true
			};
			tabs  = await browser.tabs.query(qryObj);
			ret = saveTabsAsText(tabs);
			break;
		case 'savallhtm':
			qryObj = {
			    hidden:false,
			    currentWindow:true
			};
			tabs  = await browser.tabs.query(qryObj);
			ret = saveTabsAsHtml(tabs);
			break;
		case 'savselhtm':
			qryObj = {
			    highlighted: true,
			    hidden:false,
			    currentWindow:true
			};
			tabs  = await browser.tabs.query(qryObj);
			ret = saveTabsAsHtml(tabs);
			break;
		default:
			console.error('unknown command', cmd);
			break;
	}
	if(ret){
		browser.browserAction.disable();
		setTimeout( () => {
			browser.browserAction.enable();
		},300); // make the icon blink 

		const nid = await notify(extname, manifest.commands[cmd].description.substr(5));
		if(nid > -1){
		setTimeout( () => {
			browser.notifications.clear(nid);
		},3000); // hide notification after 3 seconds
		}
	}
	return ret;
}

async function onStorageChange(/*changes, area*/) {
  	singleActionMode = await getFromStorage('boolean', 'singleActionMode', false);
  	singleActionAction = await getFromStorage('string', 'singleActionAction', 'cpyalltxt');
	disableNotifications = await getFromStorage('boolean', 'disableNotifications', false);
	

	browser.menus.removeAll();

	if(singleActionMode){
		browser.browserAction.setPopup({ popup: "" });
		browser.browserAction.setTitle({ title: mfest.commands[singleActionAction].description });
		for(const cmd of Object.keys(mfest.commands)){
			browser.menus.create({
			  type: "radio",
			  id: ""+cmd,
			  checked: (cmd === singleActionAction),
			  title: mfest.commands[cmd].description,
			  contexts: ["browser_action"],
			  onclick: (info/*,tab*/) => {
				singleActionAction = info.menuItemId;		  
				setToStorage('singleActionAction', singleActionAction);
			  }
			});
		}
	}else{
		 browser.browserAction.setPopup({ popup: "popup.html" });
	}
}

(async ()=>  {
	await onStorageChange();
})();

browser.storage.onChanged.addListener(onStorageChange);

browser.commands.onCommand.addListener(onCommand);

browser.runtime.onMessage.addListener(
    (data /*, sender*/) => {
	  if(typeof data.cmd === 'string'){
		return Promise.resolve(onCommand(data.cmd));
	  }
	  return false;
});

browser.browserAction.onClicked.addListener( () => {
	onCommand(singleActionAction);
});

