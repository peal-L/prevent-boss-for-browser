
var $switch = $('.switch-open');
var $inputFake = $('.input-fake');


// 获取当前页面的工作状态
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    var message = { method: 'getStatus' }
    chrome.tabs.sendMessage(tabs[0].id, message, res => {




        // 复原当前页面工作设置
        res ? $switch.addClass('switch-on') : $switch.removeClass('switch-on');
        // 复原之后在开启动画避免打开时按钮闪
        setTimeout(() => $('.switch-open>.switch-block').addClass('switch-init'), 300);

        // 还原上次的虚拟页面地址
        var url = localStorage.getItem('fakeUrl') || 'https://common.peal.cc/fakePage/百度一下，你就知道.html';
        var urlMatch = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/);
        $inputFake.val(url);

        // 开始工作模式
        $switch.on('click', function () {
            var $this = $(this);
            if ($this.hasClass('switch-on')) {
                // 关闭
                startWork(url, false);
                $this.removeClass('switch-on');
            } else {
                // 输入了新的虚拟页面url
                var inputUrl = $inputFake.val();
                if (inputUrl !== url) {
                    // 判断url的正确性
                    if (urlMatch.test(inputUrl)) {
                        url = inputUrl;
                        // 开启工作模式
                        startWork(url, true);
                    }
                    else {
                        $inputFake.addClass('input-tip');
                        return false;
                    }
                }
                else {
                    startWork(url, true);
                }
                // 开启
                $this.addClass('switch-on');
            }
        });

        // 地址框去除输入弹窗
        $inputFake.on('blur', function () {
            var $this = $(this);
            if ($this.val() && $this.hasClass('input-tip')) $this.removeClass('input-tip');
        });

        $('.title').on('click', function () {
            window.open('https://peal.cc/blog?id=31')
        })



    })
})


// 连接页面注入的JS
function startWork(url, open) {
    // 加入本地存储
    localStorage.setItem('fakeUrl', url);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        var message = { method: 'cover', url: url, open: open }
        chrome.tabs.sendMessage(tabs[0].id, message, res => {
            if (res) {
                if (open) setTimeout(function () {
                    window.close();
                }, 500);
            }
            else {
                $('.error-tip').show();
                setTimeout(function () {
                    $switch.removeClass('switch-on');
                }, 100)
            }
        })
    })
}


// 连接常驻JS后台
// var bg = chrome.extension.getBackgroundPage();