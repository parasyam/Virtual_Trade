const sessionToUserMap=new Map();

function setUser(id,user){
    sessionToUserMap.set(id,user);
};
function getUser(id){
    return sessionToUserMap.get(id);

}
function removeUser(sessionId) {
    sessionToUserMap.delete(sessionId);  
}

module.exports={
    setUser,
    getUser,
    removeUser,
}