
interface User {
    id: string;
    name: string;
}

// 判断user参数是否为User类型，返回true和false
function isUser(user: unknown) : user is User {
    return (
        typeof user === 'object' &&
        user !== null &&
        'id' in user &&
        'name' in user
    );
}
const payload = {

}

// true表示可以被类型推断
if (isUser(payload)) {
    payload.name
}
