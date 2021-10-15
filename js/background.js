var activeUrl = {}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method === 'get') {
        sendResponse({
            // 如果为false，说明是点击页面关闭过的，则不开启
            open: activeUrl[request.url[0]] === false ? false : (Boolean(activeUrl[request.url[0]]) || Boolean(activeUrl[request.url[1]])),
            url: localStorage.getItem('fakeUrl'),
            activeUrl: activeUrl
        });
    }
    else if (request.method === 'add') {
        if (request.url) activeUrl[request.url] = true;
    }
    else if (request.method === 'delete') {
        if (request.url && Boolean(activeUrl[request.url])) activeUrl[request.url] = false;
    }
});