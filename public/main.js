Vue.config.devtools = true;

Vue.component('header-area',{
    template : '#header-template'     
})
Vue.component('page-header', {
    template : '#page-header-template', 
    props : ['bcTitle']
})
Vue.component('sidebar',{
    template : '#sidebar-template', 
    props : ['byCenterCollapsed', 'byPhotographerCollapsed']
}) 
Vue.component('footer-area',{
    template : '#footer-template', 
}) 
Vue.component('result-item',{
    template : '#result-item-template', 
    props : ['item']   
}) 
Vue.component('content-area',{
    template : '#content-area-template', 
    props : ['errormsg']
}) 
Vue.component('keywords',{
    template : '#keywords-template', 
    props : ['keywords','showKeywords'], 
    methods : {
        keywordSelected : function(){
            this.$root.showKeywords = false;
        }
    }
}) 




/************COMPONENTS W ROUTES************/
const Single = Vue.component('single',{
    template : '#single-template', 
    props : ['single-item'],
    data : function(){
        return {
            nextGuy : 'undefined', 
            prevGuy : 'undefined', 
            topPos : '', 
            byCenterCollapsed : true,   
            byPhotographerCollapsed : true
        }
    },
    created : function(){
        var _this = this;
        window.removeEventListener('keyup',clicker); 
        window.addEventListener('keyup', clicker);

        function clicker(e){
            if ((e.keyCode || e.which) == 39) {                 
                if(document.querySelector('.next') !== null){
                    document.querySelector('.next').click();
                }
            }
            if ((e.keyCode || e.which) == 37) {
                if(document.querySelector('.previous') !== null){
                    document.querySelector('.previous').click();
                }
            }
        }
    },
    updated : function(){

        var singleItem = this.$root.singleItem;
        var items = this.$root.items;
        if(singleItem.data && items.length > 0){
            
            var currentId = singleItem.data.items[0].data[0].nasa_id;
            
            for(var i=0;i<items.length; i++){
                if(currentId == items[i].id){                   
                    this.nextGuy = items[parseInt(i+1)] ? 
                        items[parseInt(i+1)].id : 'undefined';
                    this.prevGuy = items[parseInt(i-1)] ? 
                        items[parseInt(i-1)].id : 'undefined';
                }
            }
        }
        //positions the prev / next arrows to middle of page:
        var heightOfArrows = 110 // estimated height..
        var pos = (window.innerHeight / 2) - heightOfArrows; 
        this.topPos = pos + "px";    
  
    },
    methods : {   
        extIsNotJson : function(filename){
            return filename.indexOf('.json') !== -1 ? false : true;
        },     
        goNext : function(){
            this.$root.singleItem = {}; 
            this.$router.push({name : 'single', params : {id : this.nextGuy}}); 
        },
        goPrevious : function(){
            this.$root.singleItem = {}; 
            this.$router.push({name : 'single', params : {id : this.prevGuy}}); 
        },
        closeModal : function(){             
            this.$root.singleItem = {}; 
            if(window.sessionStorage.ni_searchterm){
                var term = window.sessionStorage.ni_searchterm; 
                this.$router.push({name : 'search', params : {term : term}}); 
            }else{
                this.$router.push('/');
            }
        }, 
        convertDate : function(theDate){
            var date = new Date(theDate);
            return date.getFullYear()+'-' + (date.getMonth()+1) + '-'+date.getDate();
        }
    }
}) 

const Home = Vue.component('home', {
    template: '#home-template',  
    data : function(){
        return {
            bcTitle : '', 
            byCenterCollapsed : false,   
            byPhotographerCollapsed : false             
        }
    }
})

const Search = Vue.component('search', {
    template: '#search-template', 
    computed : {
        errormsg : function(){
            return this.$root.errormsg;
        }
    },
    data : function(){
        return {
            bcTitle : 'Search Results', 
            byCenterCollapsed : true, 
            byPhotographerCollapsed : true
        }
    }
})

const router = new VueRouter({
    routes : [
        {   path: '/', component: Home, name : 'home' },  
        {   path: '/single/:id', component: Single, name : 'single' }, 
        {   path: '/search/:term', component: Search, name : 'search' }
      ] 
})

const vm = new Vue({
    el : '#app',
    router : router,  
    methods : {     
        fetchData : function (to, from) {
            if(this.$route.name == 'single'){
                this.getSingle(to.params.id);   
            }else if(this.$route.name == 'search'){
                this.submitSearch(to.params.term);
            }else if(this.$route.name == 'home'){
                this.items = [];
                this.filtersByCenter = []; 
                this.filtersByKeyword = []; 
                this.filtersByPhotographer = [];
                this.getApods();
            }
        },  
        getApods : function(){
            var _this = this;             
            if(_this.apods.length === 0){
                // axios.get('public/temp/apod.json')                
                axios.get('/api/apod')
                    .then(function (response) {  
                        _this.apods = response.data;
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
            }            
        },
        getFilterLink(filterStr,filterKey){
            var link = '';
            //remove everything after first occurence of "&" 
            var pattern = /[^&]*/;    
            var route = this.$route.path;
            route = route.match(pattern)[0];
            //remove all "/" from str *router thinks its a route
            filterStr = filterStr.replace(/\//g,' ');
            link = route+'&'+filterKey+'=' + filterStr;
            return link;
        },  
        parse : function(response){     
            var final = [];
            for(var i = 0; i < response.data.items.length; i++ ){
                if(response.data.items[i].data[0].media_type == 'image'){                  
                    response.data.items[i].id = response.data.items[i].data[0].nasa_id;
                    final.push(response.data.items[i]);  
                }      
            } 
            return final;
        },       
        getSingle : function(id){
            var _this = this;         
            axios.get('/api/details?id='+id)
                .then(function (response) {  
                    _this.singleItem = response;
                    _this.searchVisible = false;
                })
                .catch(function (error) {
                    console.log(error);
            });
        }, 
        submitSearch : function(term){             
            var _this = this;
            _this.errormsg = '';
            _this.showLoading = true;
            _this.singleItem = {};
            
            var t = term ? term : _this.searchTerm;        
            axios.get('/api/search?term='+t)
                .then(function (response) {  
                    _this.items = _this.parse(response);
                    if(_this.items.length > 0){  
                        if(_this.$route.path.indexOf('&') === -1){
                            _this.filtersByCenter = _this.buildFilters('center');
                            _this.filtersByKeyword = _this.buildFilters('keywords');
                            _this.filtersByPhotographer = _this.buildFilters('photographer');
                        }  
                    }else{
                        _this.errormsg = 'No results have been found';
                    }                    
                    _this.searchVisible = false;   
                    _this.showLoading = false;
                    window.sessionStorage.setItem('ni_searchterm', t);
                })
                .catch(function (error) {
                    var msg = '';
                    msg = "A server error has occurred."; 
                    if(error.response){
                        msg += " Code: " + error.response.status; 
                        msg += " Text: " + error.response.statusText;
                    }
                    _this.items = [];
                    _this.errormsg = msg;
                    _this.searchVisible = false;          
                    _this.showLoading = false;
                    console.log(error);
            });
            return false;            
        }, 
        remove_duplicates : function (arr) {
            var obj = {};
            var ret_arr = [];
            for (var i = 0; i < arr.length; i++) {
                obj[arr[i]] = true;
            }
            for (var key in obj) {
                ret_arr.push(key);
            }
            return ret_arr;
        }, 
        buildFilters : function(key){
            var filters = [];         
            if(key == 'keywords'){      
                for(var i=0; i<this.items.length; i++){
                    if(this.items[i].data[0][key]){                         
                        for(var x=0; x<this.items[i].data[0][key].length; x++){
                           if(this.items[i].data[0][key][x]){
                                filters.push(this.items[i].data[0][key][x]);
                           }                                                
                        }
                    } 
                }
            }else{
                for(var i=0; i<this.items.length; i++){                     
                    if(this.items[i].data[0][key]){
                        filters.push(this.items[i].data[0][key]);
                    }
                }
            }           
            filters = this.remove_duplicates(filters);            
            return filters.sort();
        }
    },  
   
    watch : {        
        '$route' : {
            'immediate' : true,
            handler : 'fetchData'
        }   
    }, 
    data : {
        searchTerm : '',
        showLoading : false,
        searchVisible : false,    
        singleItem : {},
        items : [],      
        sidebarExpand : false,  
        errormsg : '', 
        showKeywords : false,
        filtersByCenter : [], 
        filtersByKeyword : [], 
        filtersByPhotographer : [], 
        apods : []
    }     
});