function PostData (url, bearerToken) {
  this.url = url;
  this.bearerToken = bearerToken;
  this.callType = "iteration";
  this.callback;
  this.callbackFail = handleFailedPost;
  this.debug = false;
}

function UrlParameters() {
  this.bearerToken;
  this.global = {
    organization:'',
    organizationId:'',
    project:'',
    projectId:'',
    team:'',
    teamId:''
  };
  this.additional = {};
  this.getUrl = replaceUrlParameters;
}

function replaceUrlParameters(url) {
  // replace the global parameters
  return url.regexReplace(this.global)
  .regexReplace(this.additional);
}

function httpGetData(_post) {
  if(_post.debug) {
    console.log('Running httpGetData:', _post);
  }
  
  if(_post.url) {
    if(_post.debug) {
      console.log('Authorization:', _post.bearerToken);
    }
    increaseRequestCount(_post.callType, false);

    fetch(_post.url, {
      method: 'get',
      headers: new Headers({
        'Authorization': _post.bearerToken
      })
    })
    .then((dataWrappedByPromise) => {

      dataWrappedByPromise.json().then(data => {
        if(typeof _post.callback === "function") {
          _post.callback(data);
        }
        else {
          console.warn("To access this data please pass through a callback. The data your requested is: ", data);
        }
        increaseRequestCount(_post.callType, true);
      });
    })
    .catch((error) => {
      increaseRequestCount(_post.callType, true);
      if(error)  {
        if(typeof _post.callbackFail === "function") {
          _post.callbackFail(error);
        }
        else {
          console.error("An error occured when fetching data. You can handle this error by passing a callback: ", error);
        }
      }
    });
  }
  else {
    var postData = new PostData('example url',
    'unique bearer token required for authentication');
    postData.callback = 'function (optional)';
    postData.callbackFail = 'function (optional)';
    postData.debug = 'true|false (default false)';
    console.warn("In order to call httpGetData please pass through a postData object: ", postData);
  }
}

function increaseRequestCount(type, isComplete) {
  switch(type) {
    case "team":
    if(isComplete) {
      app.teamDetailRequestsCompleted++;
    }
    else {
      app.teamDetailRequests++;
    }
    break;

    case "iteration":
    if(isComplete) {
      app.iterationRequestsCompleted++;
    }
    else {
      app.iterationRequests++;
    }
    break;

    case "itemType":
    if(isComplete) {
      app.itemTypeRequestsCompleted++;
    }
    else {
      app.itemTypeRequests++;
    }
    break;

  }
}

function handleFailedPost(error) {
  console.error("failed to run PostData.fetch:", error);
}


function TeamMember (id, displayName, uniqueName, avatarUrl, isAdmin) {
  this.id = id;
  this.displayName = displayName;
  this.uniqueName = uniqueName;
  this.avatarUrl = avatarUrl;
  this.isAdmin = isAdmin;
  this.activity = [];
  this.offDays = [];
}


function Iteration (id, name, startDate, finishDate) {
  this.id = id;
  this.name = name;
  this.startDate = startDate;
  this.finishDate = finishDate;
}

function WorkItem (id, rev, name, link, priority, state, type, assignedId, startDate, endDate, activity, capacity, isHalfDayStart, isHalfDayEnd) {
  this.id = id;
  this.rev = rev;
  this.name = name;
  this.link = link;
  this.priority = priority;
  this.state = state;
  this.stateColor;
  this.type = type;
  this.typeColor;
  this.typeIcon;
  this.assignedId = assignedId;
  this.assignedName;
  this.assignedAvatar;
  this.tasks = [];
  this.startDate = startDate;
  this.endDate = endDate;
  this.activity = activity;
  this.capacity = capacity;
  this.isHalfDayStart = isHalfDayStart;
  this.isHalfDayEnd = isHalfDayEnd;
}

function WorkItemType (name, color, icon, states) {
  this.name = name;
  this.color = color;
  this.icon = icon;
  this.states = states;
}


Object.defineProperty(String.prototype, "regexReplace", {
  value: function regexReplace(obj) {
    var url = this;
    for (var p in obj) {
      if(obj.hasOwnProperty(p)) {
        var replace = '{' + p + '}';
        var re = new RegExp(replace,"g");
        url = url.replace(re, obj[p]);
      }
    }
    return url;
  },
  writable: true,
  configurable: true
});

Date.prototype.isWeekend = function() {
  var date = new Date(this.valueOf());
  var day = date.getDay();
  return (day === 6) || (day === 0);
}