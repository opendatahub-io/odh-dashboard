'use strict'

function getData(){

    const path = require('path')
    const fs = require("fs")
    const data = require(path.join(__dirname, 'frontend/public/odhDataRes.json'));
  
    const k8s = require('@kubernetes/client-node');
    const kc = new k8s.KubeConfig();
    //kc.loadFromFile('/home/parsoni/.kube/config');
    kc.loadFromDefault();
    const watch = new k8s.Watch(kc);

    watch.watch('/apis/route.openshift.io/v1/namespaces/opendatahub/routes',
    {
        allowWatchBookmarks: false,
        
    },
    (type, apiObj, watchObj) => {
        
        data.forEach((x) => {
            if(x.imgName == apiObj['metadata'].name){
                
                x.link = 'http://' + apiObj['spec'].host;
            }
            }
        )
        //console.log(data)    
        fs.writeFile(path.join(__dirname, 'frontend/build/odhDataRes.json'), JSON.stringify(data), err => { 
     
          // Checking for errors 
          if (err) throw err;  
         
        });   

    },
    // done callback is called if the watch terminates normally
    (err) => {
        // tslint:disable-next-line:no-console
        console.log(err);
    })
.then((req) => {
    // watch returns a request object which you can use to abort the watch.
    setTimeout(() => { req.abort(); }, 3 * 1000);
}); 
}

module.exports = {
    getData
  }