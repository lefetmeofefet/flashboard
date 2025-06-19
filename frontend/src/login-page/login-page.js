import {html, createYoffeeElement} from "../../libs/yoffee/yoffee.min.js"
import {chooseWall, GlobalState} from "../state.js";
import {Api} from "../api.js"
import "../components/text-input.js"
import "../components/x-button.js"
import "../components/x-icon.js"
import {getUrlParams, updateUrlParams} from "../../utilz/url-utilz.js";
import {showToast} from "../../utilz/popups.js";
import {Flutter} from "../flutter-interface.js";


createYoffeeElement("login-page", (props, self) => {
    let state = {
        signupMode: false,
        nicknameMode: false,
        loadingUser: true
    }

    async function loadUser() {
        GlobalState.loading = true
        let user = await Api.getUser()
        if (user != null) {
            await continueWithUser(user)
        }
        GlobalState.loading = false
        state.loadingUser = false
    }
    // First attempt to load user with existing cookies
    loadUser()

    async function finishLogin(user) {
        GlobalState.user = user
        await new Promise(res => requestAnimationFrame(() => res())) // This is for loader to show up
        GlobalState.walls = await Api.getWalls()
        let urlParams = getUrlParams()
        if (urlParams.wall != null) {
            let wall = GlobalState.walls.find(wall => wall.name === urlParams.wall)
            if (wall != null) {
                chooseWall(wall.id)
            }
        }
    }

    let user

    async function continueWithUser(userInfo) {
        if (userInfo.nickname == null) {
            user = userInfo
            state.nicknameMode = true
        } else {
            finishLogin(userInfo)
        }
    }

    async function login() {
        let email = self.shadowRoot.querySelector("#email-input").value
        let password = self.shadowRoot.querySelector("#password-input").value
        if (email.trim() === "" || password.trim() === "") {
            return
        }
        try {
            let user = await Api.login(email, password)
            await continueWithUser(user)
        } catch (e) {
            showToast(e.errorMessage || "Error loggin in", {error: true})
        }
    }

    async function signUp() {
        let email = self.shadowRoot.querySelector("#email-input").value
        let password = self.shadowRoot.querySelector("#password-input").value
        if (email.trim() === "" || password.trim() === "") {
            return
        }
        try{
            let user = await Api.signUp(email, password)
            await continueWithUser(user)
        } catch (e) {
            showToast(e.errorMessage || "Error signing up", {error: true})
        }
    }

    async function setNickname() {
        let nickname = self.shadowRoot.querySelector("#nickname-input").value
        if (nickname.trim() === "") {
            return
        }
        user.nickname = nickname
        await Api.setNickname(nickname)
        finishLogin(user)
    }

    async function signInWithGoogleToken(token) {
        try {
            let user = await Api.googleAuth(token)
            await continueWithUser(user)
        } catch(e) {
            showToast(e.errorMessage || "Error signing in with google", {error: true})
        }
    }

    // This function is only for calling from native flutter app
    window.signInWithGoogleIdAndEmail = async (userGoogleId, email, name, photoUrl) => {
        try {
            let user = await Api.googleLoginGoogleId(email, userGoogleId, name, photoUrl)
            await continueWithUser(user)
        } catch(e) {
            showToast(e.errorMessage || "Error signing in with google", {error: true})
        }
    }

    self.onConnect = () => {
        window.onGoogleLibraryLoad = () => {
            // If we're in flutter, login is handled natively
            if (!Flutter.isInFlutter()) {
                google.accounts.id.initialize({
                    client_id: '798008696513-9jhivsjbs7j8pacr6d8dfps9qh25tbbp.apps.googleusercontent.com',
                    callback: async loginInfo => {
                        console.log("Login info: ", loginInfo)
                        await signInWithGoogleToken(loginInfo.credential)
                    },
                })
                google.accounts.id.renderButton(
                    self.shadowRoot.querySelector("#google-sign-in-button"),
                    {
                        type: "standard",
                        shape: "pill",
                        theme: "filled_blue",
                        text: "signin",
                        size: "large",
                        logo_alignment: "left"
                    }
                )
            }
        }
    }

    return html(GlobalState, state)`
<link href="../../style/scrollbar-style.css" rel="stylesheet">
<style>
    :host {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        gap: 12px;
        color: var(--text-color);
    }
    
    #welcome {
        margin-top: auto;
        font-size: 47px;
        line-height: 40px;
    }
    
    #to {
        font-size: 20px;
        line-height: 15px;
    }
    
    #flashboard {
        line-height: 28px;
        font-size: 37px;
        margin-bottom: 16px;
    }
    
    #choose {
        font-size: 57px;
        line-height: 43px;
    }
    
    #your {
        font-size: 20px;
        line-height: 15px;
    }
    
    #nickname {
        font-size: 46px;
        line-height: 33px;
        margin-bottom: 20px;
    }
    
    text-input {
        border-radius: 100px;
        background-color: var(--background-color-3);
        max-width: 192px;
        min-width: 192px;
        font-size: 16px;
        --placeholder-color: var(--text-color-weak-1);
    }
    
    #login-button, #continue-button {
        min-width: 232px;
        padding: 9px 0;
        background-color: var(--secondary-color);
        border-radius: 100px;
        color: var(--text-color-on-secondary);
    }
    
    #or-sign-in-using {
        opacity: 0.4;
    }
    
    #google-sign-in-button {
        display: flex;
        align-items: center;
        max-width: 233px;
        border-radius: 100px;
        background-color: #1a73e8;
        height: 41px;
        padding: 0;
        justify-content: normal;
    }
    
    #google-sign-in-button > #google-g-container {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #fff;
        height: 36px;
        min-width: 36px;
        width: 36px;
        margin-right: 12px;
        margin-left: 3px;
        border-radius: 18px;
    }
    
    #google-sign-in-button > #google-g-container > svg {
        min-width: 18px;
        width: 18px;
        height: 18px;
    }
    
    #google-sign-in-button > #google-sign-in-text {
        width: 182px;
        text-align: center;
        margin-right: 50px;
    }
    
    #signup {
        margin-top: auto;
        margin-bottom: auto;
        font-size: 16px;
        opacity: 0.6;
        display: flex;
        gap: 3px;
    }
    
    #signup > x-button {
        padding: 0 5px;
        background-color: transparent;
        box-shadow: none;
        text-decoration: underline;
        color: var(--text-color);
    }
    
</style>

${() => GlobalState.loading ? html()`
<style>
    /* Loader */
    :host::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        height: 2px;
        width: 0;
        background-color: var(--secondary-color);
        animation: loading 2s infinite;
    }
    
    @keyframes loading {
        0% { width: 0; margin-left: 0; }
        50% { width: 100%; margin-left: 0; }
        100% { width: 0; margin-left: 100%; }
    }
</style>
` : ""}

${() => state.loadingUser ? html()`
<style>
    * {
        display: none !important;
    }
</style>
` : ""}
${() => state.nicknameMode ?
        html()`
<div id="choose">CHOOSE</div>
<div id="your">YOUR</div>
<div id="nickname">NICKNAME</div>
<text-input id="nickname-input"
            placeholder="Nickname"></text-input>
<x-button id="continue-button"
          onclick=${() => setNickname()}>
    CONTINUE
</x-button>
` :
        html()`
<div id="welcome">WELCOME</div>
<div id="to">TO</div>
<div id="flashboard">FLASHBOARD</div>
<text-input id="email-input"
            placeholder="Username"
<!--            TODO: change to email after stupid apple approval!!-->
            type="email"></text-input>
<text-input id="password-input"
            placeholder="Password"
            type="password"></text-input>
<x-button id="login-button"
          onclick=${() => state.signupMode ? signUp() : login()}>
    ${() => state.signupMode ? "SIGN UP" : "LOGIN"}
</x-button>
${() => (!window.isIOS || true) && html()`
<div id="or-sign-in-using">Or ${() => state.signupMode ? "sign up" : "sign in"} with</div>
<x-button id="google-sign-in-button"
          onclick=${() => Flutter.isInFlutter() && Flutter.triggerGoogleSignIn()}>
    <div id="google-g-container">
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="LgbsSe-Bz112c"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></g></svg>
    </div>
    <div id="google-sign-in-text">Sign In</div>
</x-button>
`}

<div id="signup">
    ${() => state.signupMode ? "Have an account already?" : "No account yet?"} 
    <x-button onclick=${() => state.signupMode = !state.signupMode}>
        ${() => state.signupMode ? "Login" : "Sign Up"}
    </x-button>
</div>
`
    }
`
});
