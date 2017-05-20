if(!com) var com={};
if(!com.tobwithu) com.tobwithu={};
com.tobwithu.tooltip = {
  clearTooltip:function(em){
    while(em.firstChild != null)em.removeChild(em.firstChild);
  },
  makeTooltip:function(main,em,data){
    this.clearTooltip(em);
    var total=0;
    for(var i in data){
      var o=data[i];
      if(o.count>0){
        total+=o.count;
        var desc = document.createElement("description");
        var pre=o.data.prevCount;
        desc.setAttribute("value",o.accName+" : "+o.count+(pre!=-1&&o.count>pre?" (+"+(o.count-pre)+")":""));
        desc.setAttribute("style","color: green;");
        em.appendChild(desc);
      }
    }
    if(total==0){
      var desc = document.createElement("description");
      desc.setAttribute("value",main.getString("NoNewMsg"));
      desc.setAttribute("style","color: grey;");
      em.appendChild(desc);
    }
    for(var i in data){
      var o=data[i];
      if(o.count<0){
        var desc = document.createElement("description");
        desc.setAttribute("value",o.accName+" : "+main.getString("NotChecked"));
        desc.setAttribute("style","color: red;");
        em.appendChild(desc);
      }
    }
    return total;
  }
}