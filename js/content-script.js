
// console.log('--------------------- 脚本插入页面成功 ---------------------', 'from:' + document.referrer);

// 全局变量
window.momoyu = {
    AVstatusArr: [], // 储存视频和音频element
    coverStatus: false // 当前页面开启的状态
}

// 开关工作层函数
function addCover(url, isOpen) {
    window.momoyu.AVstatusArr = [];
    isOpen ? $(document).ready(function () {
        // 储存图标和标题
        window.momoyu.iconEl = document.querySelector('link[rel^=icon]') || document.querySelector('link[rel$=icon]') || '';
        window.momoyu.icon = window.momoyu.iconEl ? window.momoyu.iconEl.href : '';
        window.momoyu.title = document.title;
        open(url);
    }) : close();
    // console.log(window.momoyu)
}

// 开启
function open(url) {

    window.momoyu.coverStatus = true;

    var $body = $('body');
    var $html = $('html');
    // 插入fake
    $body.append('<iframe class="fish-fake-iframe" src="' + url + '"><iframe>');
    $body.addClass('fish-body-fake-hide');

    // 鼠标移入显示fake页
    $html.mouseover(() => {
        if ($body.hasClass('fish-body-fake-hide')) {
            document.title = window.momoyu.title;
            window.momoyu.iconEl.href = window.momoyu.icon;
            $body.removeClass('fish-body-fake-hide');
            // 恢复所有播放
            for (var i = 0; i < window.momoyu.AVstatusArr.length; i++) window.momoyu.AVstatusArr[i].play();
            window.momoyu.AVstatusArr = [];
        }
    })

    // 鼠标离开隐藏fake页
    $html.mouseleave(() => {
        document.title = '百度一下，你就知道';
        window.momoyu.iconEl.href = 'https://www.baidu.com/favicon.ico';
        // 如果页面fake页不存在则重新添加
        if ($('.fish-fake-iframe').length === 0) {
            $body.append('<iframe class="fish-fake-iframe" src="' + url + '"><iframe>');
            $body.append('<div class="fish-body-side-tip"></div>');
        }
        $body.addClass('fish-body-fake-hide');
        // 暂停所有播放
        $('video,audio').each(function () {
            var item = $(this)[0];
            if (!item.paused) item.pause();
            window.momoyu.AVstatusArr.push(item);
        })
    })

    // 加入后台工作列表
    chrome.runtime.sendMessage({ method: 'add', url: location.href });

    // 页面上关闭按钮
    $body.append('<div class="fish-body-side-tip"></div>');
    $('.fish-body-side-tip').on('click', function () {
        close();
    });
}

// 关闭
function close() {
    window.momoyu.coverStatus = false;

    document.title = window.momoyu.title;
    window.momoyu.iconEl.href = window.momoyu.icon;
    var $body = $('body');
    var $html = $('html');
    $body.removeClass('fish-body-fake-hide');
    $html.unbind('mouseenter');
    $html.unbind('mouseleave');
    $('.fish-fake-iframe').remove();
    // 清除页面上关闭按钮
    $('.fish-body-side-tip').remove();

    // 删除后台工作列表
    chrome.runtime.sendMessage({ method: 'delete', url: location.href });
}

// 链接常驻JS 如果该页面的来源页面已开启工作模式 那么该页面同样开启
chrome.runtime.sendMessage({ method: 'get', url: [location.href, document.referrer] }, res => {
    // console.log('--------------------- 判断当前页面或者上一个页面是否开启 ---------------------', [location.href, document.referrer], res);
    if (res.open) {
        addCover(res.url, res.open);
    }
});

// 接受来自popup页面的信息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // popup页面获取工作状态
    if (request.method === 'getStatus') {
        sendResponse(window.momoyu.coverStatus);
    }
    // popup页面开启工作模式
    else if (request.method === 'cover') {
        // console.log('--------------------- 开启工作模式 ---------------------', request)
        addCover(request.url, request.open);
        sendResponse(true);
    }
})
