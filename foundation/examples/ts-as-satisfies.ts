

interface AuthSession {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresAt: number;
}



// const asApp = {
//     type: "123"
// } as unknown as AuthSession


// const testApp : AuthSession = {
//     accessToken: "123",
//     refreshToken: "",
//     tokenType: "",
//     expiresAt: 0
// }

// const satisfiesApp  = {
//     accessToken: "123"
// } satisfies AuthSession