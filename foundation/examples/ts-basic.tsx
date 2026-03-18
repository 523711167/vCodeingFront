import {featureFlags, LearningUser, UserProfile} from "./ts-basics-demo";


const a = (val: UserProfile) : UserProfile => {

    return {
        id : 1,
        name: '',
        role: 'editor'
    }
}

let appTitle = featureFlags.appTitle;


const b = (val: LearningUser) => {
    let email: string = val.email;
}
