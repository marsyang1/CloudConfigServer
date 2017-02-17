/**
 * 管理Service、轉址以及Storage存取
 * 
 */

function WebManage(){
	var that = this;
	
	var _$currentView = false;//当前显示View
	var _currentViewID = false;//当前显示View id
	
	var _storeService = false;//资料中心
	var _loader = false;//loading model
	var _dialogService = false;//dialog model
	var _userService = false;
	
	var _ajaxObj = {};//管理同样的url 不重复执行
	var _$views = {};//管理同样的url 不重复执行
	var _urlParamValue = {};//url get param
	
	var _viewAuth = [];//当前用户访问html权限
	
	//预设玩家访问html权限
	var _customViewAuth = [
	    'index',
	];
	
	//预设代理访问html权限
	var _agentViewAuth = [
		'index',
	];
	
	//预设游客访问html权限
	var _defultViewAuth = [
	    'index',
	];
	
	//方法對應
	var _viewUrls = {
		'index':'index.html',
	};
	
	//所有動作對應的網址
	var _urls = {
		'initialize':'mobi/initialize.php',//初始化
	};
	
	//Storage Name
	var _storages = {
		'index':'mobi-index-storage',
	};
	
	that.getVersion = function(){
		return Config.VERSION;
	};
	
	//轉址
	that.redirect = function(key,param,target){
		_redirect(key,param,target);
	};
	
	//Get Object from SessionStorage
	that.getSessionStorage = function(key){
		return getSessionStorage(key);
	};
	//set Object in SessionStorage
	that.setSessionStorage = function(key,param){
		setSessionStorage(key,param);
	};

	//Get Object from Storage
	that.getLocalStorage = function(key){
		return getLocalStorage(key);
	};
	//set Object in Storage
	that.setLocalStorage = function(key,param){
		setLocalStorage(key,param);
	};
	
	/**
	 * 载入view
	 * @param {String} name view name;
	 */
	that.loadView = function(name){
		if(_viewAuth.indexOf(name)==-1){
			name = 'index';
		}
		_loadView.apply(null,[name,function(){
			//修改history，让上下页有作用
			_initUrlParamValue();
			_setUrlParamValue('view',name);
			_setUrlParamValue('v',Config.VERSION);
			window.history.pushState(null,name,getGetParamUrl(Config.ROOTFOLDER+'index.html',_urlParamValue));
			
		}]);
	};
	
	
	/**
	 * 取得MUI 弹窗 model 
	 */
	that.getDialog = function(){
		if(_dialogService)return _dialogService;
		if(!$.isFunction(DialogService)){
			alert('DialogService 加载失败，请重新刷新页面。');
			return;
		}
		_dialogService = new DialogService();
		return _dialogService;
	};
	
	/**
	 * get loader
	 */
	that.getLoader = function(){
		if(_loader)return _loader;
		
		if(!$.isFunction(Loader)){
			alert('Loader 加载失败，请重新刷新页面。');
			return;
		}
		_loader = new Loader();
		return _loader;
	};
	

	/**
	 * get StoreService
	 */
	that.getStoreService = function(){
		if(_storeService)return _storeService;
		if(!$.isFunction(StoreService)){
			alert('StoreService 加载失败，请重新刷新页面。');
			return;
		}
		_storeService = new StoreService();
		return _storeService;
	};
	
	that.abortAjax = _abortAjax;
	
	/**
	 * 统一使用 ajax
	 * @param {Object} config 资料 
	 * {
	 *		url:来源网址,
	 *		param:请求参数,
	 *		timeout:timeout ms,
	 *		callback:回调方法
	 *	}
	 */
	var _dataType = ['json'];
	that.ajax = function(config){
		//预设参数
		var _config = {
			url:false,
			param:{},
			type:'post',
			dataType:'json',
			timeout:false,
			callback:false
		};
		
		$.extend(_config,config);

		//统一回传讯息
		var _result = {
			success:false,
			message:false
		};
		//检查网址是否存在
		if(!_config.url){
			_result.message='来源网址不存在！';
			_executeCallBack(_result);
			return;
		}
		
		//检查返回资料格式
		if(_dataType.indexOf(_config.dataType)==-1){
			_result.message='不支持'+_config.dataType+'资料格式！';
			_executeCallBack(_result);
			return;
		}
		
		//避免重複執行
		if(_ajaxObj[_config.url]){
			_result.message='目前正在执行，请稍候再尝试！';
			_executeCallBack(_result);
			return;
		}
		_ajaxObj[_config.url] = true;
		
		//回調
		function _executeCallBack(result){
			if(typeof _config.callback ==='function'){
				_config.callback(result);
			}
		}
		_ajaxObj[_config.url] = $.ajax({
			type:_config.type,
			url:_config.url,
			data:_config.param,
			dataType:_config.dataType,
			timeout:_config.timeout,
			success:function(data,success,response){
				_ajaxObj[_config.url] = false;
				$.extend(_result,data);
				_result.message = _getHttpStatusText(response);
				_result.success = true;
				_executeCallBack(_result);
				
				_result = null;
			}
		}).fail(function(response) {
			_ajaxObj[_config.url] = false;
			_result.message = _getHttpStatusText(response);
			_result.success = false;
			if(_result.message){
				_executeCallBack(_result);
			}else{
				
			}
			_result = null;
		});
		
		return _ajaxObj[_config.url];
	};

	_initialize();
	/**
	 * 初始化
	 * 
	 */
	function _initialize(){
		_initUrlParamValue();
		
		window.onpopstate = function(event) {
			_initUrlParamValue();
			//一定要使用原生方法避免重复history.pushState，导致无法下一页
			_loadView(_getUrlParamValue('view')||'index');
		};

		//离开网页时，检查是否有正在运行的ajax
		$(window).bind('beforeunload',function(){
			if(_hasRunAjax()){
				return '目前尚有正在执行的动作，可能会造成资料异常，确定要离开？';
			}
		});
		
		// 离开网页时，退出运行的ajax
		$(window).bind('unload',_abortAjax);
		
		//绑定使用者更新事件
		that.getStoreService().bind(StoreDataName.USER,function(store){
			var views = $('body .container .views .view');
			var lastAuth = _viewAuth;
			_viewAuth = _defultViewAuth;
			var $el;
			if(store.data){
				if('AGENT'==store.data.role){
					_viewAuth = _agentViewAuth;
				}else if('MONEY_CUSTOMER'==store.data.role){
					_viewAuth = _customViewAuth;
				}
			}
			$.each(views,function(key,element){
				$el = $(element);
				if(_viewAuth.indexOf($el.attr('data-view'))==-1){
					//移除element
					$el.remove();
					_$views[$el.attr('data-view')] = false;
				}
			});
			
			that.getDialog().close();
			//如果当前页面有权限不做任何变动
			if(_currentViewID&&_viewAuth.indexOf(_currentViewID)!=-1){
				return;
			}
			//如果参数有带view，以view为主
			if(_viewAuth.indexOf(_getUrlParamValue('view'))!=-1){
				that.loadView(_getUrlParamValue('view'));
			}else{
				that.loadView('index');
			}
			
//			if(store.state==that.getStoreService().state.DELETE){
//				that.loadView('index');
//				that.getDialog().close();
//			}else if(lastAuth!=_viewAuth){
//			    that.loadView(_getUrlParamValue('view')||'index');
//			}
		},false);
		that.getStoreService().set(StoreDataName.USER,false);
		//向Server取得资料
//		that.ajax({url:_urls['initialize']});
	}
	
	
	/**
	 * 如果有ajax在运行的话，就退出运行的ajax
	 */
	function _abortAjax(){
		for(var key in _ajaxObj){
			if(_ajaxObj[key]&&_ajaxObj[key].abort){
				_ajaxObj[key].abort();
				_ajaxObj[key] = false;
			}
		}
	}

	/**
	 * 检查是否有正在运行的ajax
	 */
	function _hasRunAjax(){
		for(var key in _ajaxObj){
			if(_ajaxObj[key]&&_ajaxObj[key].abort){
				return true;
			}
		}
		return false;
	}
	
	/**
	 * 刷新资料
	 */
	function _refreshStoreData(refreshData){
		for(var key in refreshData){
			that.getStoreService().set(key,refreshData[key]);
		}
	}
	
	/**
	 * 取得请求失败信息
	 * @param {String} statusCode HttpStatusCode
	 * @param {String} statusText status = 0 有不同的状况
	 * @return {String} text 对应的信息
	 */
	function _getHttpStatusText(response){
		var text = '';
		if(response.status!=0){
			switch (response.status){
				case 200:
					if(response.responseJSON&&response.responseJSON.refreshData){
						_refreshStoreData(response.responseJSON.refreshData);//刷新资料
					}
					break;
				case 400:
					text = '當前請求無法理解！';
					break;
				case 401:
					that.getStoreService().set(StoreDataName.USER,false);//清除使用者资料
					text = '用户验证失败！';
					break;
				case 403:
					text = '拒絕執行當前請求！';
					break;
				case 404:
					text = '网址不存在！';
					break;
				case 408 :
					text = '请求超时，请稍候再试！';
					break;
				case 500 :
					text = '发生无法预料错误！';
					break;
				case 502 :
					text = '请求无回应，请稍候再试！';
					break;
				case 504 :
					text = '请求超时，请稍候再试！';
					break;
			}
		}else{
			switch (response.statusText){
				case 'error':
					text = '网路异常，请稍候再试！';
					break;
				case 'timeout':
					text = '请求超时，请稍候再试！';
					break;
				case 'abort':
//					text = '请求已中断！';
					text = false;
					break;
			}
		}
		return (response.responseJSON&&response.responseJSON.message)||text;
	}
	
	/**
	 * 加载View
	 */
	function _loadView(name,callback){
		if(typeof name !=='string'||!_viewUrls[name]){
			alert('view 不存在');
			return;
		}
		if(name==_currentViewID){
			return;
		}
		that.getLoader().open('加载中');
		//已存在
		if(_$views[name]){
			if(!(_$views[name] instanceof jQuery)){
				that.getLoader().close();
				return;
			}
			$('body').removeClass(_currentViewID);
			if(_$currentView instanceof jQuery){
				_$currentView.removeClass('active');
			}
			_currentViewID = name;
			_$currentView = _$views[name];
			_$currentView.addClass('active');
			$('body').addClass(_currentViewID);
			that.getStoreService().set(StoreDataName.ACTIVEVIEW,{id:_currentViewID});
			that.setSessionStorage('common',{activeView:_currentViewID});
			that.getLoader().close();
			$.isFunction(callback)&&callback();
		}else{
			//先占用 避免重载
			_$views[name] = true;
			var $tempView = $(String.format('<div class="view {0}" data-view="{0}"></div>',name));
			$tempView.load(Config.BASEURL+Config.ROOTFOLDER+'views/'+_viewUrls[name]+'?'+Config.VERSION
			,function(response, status, xhr){
				that.getLoader().close();
				var text = _getHttpStatusText(xhr);
				if(text){
					_$views[name] = false;
					alert(text);
				}else{
					if(_currentViewID){
						$('body').removeClass(_currentViewID);
						if(_$currentView instanceof jQuery){
							_$currentView.removeClass('active');
						}
					}
					$('body .container>.views').prepend($tempView);
					$('body').addClass(name);
					
					_currentViewID = name;
					_$currentView = $tempView;
					_$currentView.addClass('active');
					_$views[name] = _$currentView;
					that.getStoreService().set(StoreDataName.ACTIVEVIEW,{id:_currentViewID});
					that.setSessionStorage('common',{activeView:_currentViewID});
					$.isFunction(callback)&&callback();
				}
				$tempView = null;
			});
		}
	}

	/**
	 * 解析Url param内容
	 */
	function _initUrlParamValue() {
		_urlParamValue = getUrlParam();
	}
	
	/**
	 * 取得路径传入参数
	 */
	function _getUrlParamValue(name){
		return _urlParamValue[name];
	}
	/**
	 * 取得路径传入参数
	 */
	function _setUrlParamValue(name,value){
		_urlParamValue[name] = value;
	}
	
	//轉址
	function _redirect(key,param,target){
		var url = _urls[key];
		if(!url){
			alert(key+' 不存在');
			return;
		}
		setSessionStorage(key,param);
		if(!/^(http|https):\/\//.test(url)){
			url = Config.BASEURL+url;
		}
		if(!target){
			that.getLoader().open('跳转中');
			window.location.href = url;
		}else if(target=='_blank '){
			window.open(url,target)
		}
		
		url = null;
	}
	
	/**
	 * get SessionStorage
	 */
	function getSessionStorage(key){
		if(!key)return undefined;

		var name = _storages[key];
		var storage = sessionStorage[name];
		if(storage){
			return JSON.parse(storage);
		}else{
			return {};
		}
		name = storage = null;
	}
	
	/**
	 * set SessionStorage
	 */
	function setSessionStorage(key,param){
		if(!key)return;
		if(!param)return;
		
		var name = _storages[key];
		var storage = sessionStorage[name];
		if(storage){
			var obj = JSON.parse(storage);
			$.extend(obj,param);
			sessionStorage[name] = JSON.stringify(obj);
		}else{
			sessionStorage[name] = JSON.stringify(param);
		}
		name = storage = null;
	}
	
	/**
	 * get LocalStorage
	 */
	function getLocalStorage(key){
		if(!key)return undefined;

		var name = _storages[key];
		var storage = localStorage[name];
		if(storage){
			return JSON.parse(storage);
		}else{
			return {};
		}
		name = storage = null;
	}
	
	/**
	 * set LocalStorage
	 */
	function setLocalStorage(key,param){
		if(!key)return;
		if(!param)return;

		var name = _storages[key];
		var storage = localStorage[name];
		if(storage){
			var obj = JSON.parse(storage);
			$.extend(obj,param);
			localStorage[name] = JSON.stringify(obj);
		}else{
			localStorage[name] = JSON.stringify(param);
		}
		name = storage = null;
	}
}
