async function initializeGaramanteIDAuthentication(callbacks) {
    const urlParams = new URLSearchParams(window.location.search);
    const isAuth = urlParams.get('auth');

    if (isAuth) {
        await $.ajax({
            url: "http://localhost:3033/token",
            type: "GET",
            xhrFields: {
                withCredentials: true
            },
            success: function (data) {
                if (data.status === 1) {
                    localStorage.setItem("token", data.token);
                }
            }
        });
    }

    if (localStorage.getItem("token")) {
        $.ajax({
            url: "http://localhost:3033/me",
            type: "GET",
            xhrFields: {
                withCredentials: true
            },
            headers: {"Authorization": localStorage.getItem('token')},
            success: function (data) {
                if (data.status === 1) {
                    garamanteIDAccount.userData = data.user;
                    callbacks.authenticated(data.user);
                } else {
                    callbacks.unauthenticated();
                }
            },
            error: function () {
                callbacks.unauthenticated();
                localStorage.removeItem("token");
            }
        });
    } else {
        callbacks.unauthenticated();
    }
}

const garamanteIDAccount = {
    userData: {
        id: 0,
        first_name: "",
        last_name: "",
        email: "",
    },
    user: async function () {
        if (this.userData.id === 0) {
            await this.loadUser();
        }
        return this.userData;
    },
    loadUser: function () {
        const gIA = this;
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "http://localhost:3033/me",
                type: "GET",
                xhrFields: {
                    withCredentials: true,
                },
                headers: {
                    Authorization: gIA.token,
                },
                success: function (data) {
                    if (data.status === 1) {
                        gIA.userData = data.user;
                        resolve();
                    } else {
                        reject();
                    }
                },
                error: function () {
                    gIA.userData = {
                        id: 0,
                        first_name: "",
                        last_name: "",
                        email: "",
                    };
                    reject();
                },
            });
        });
    },
    tokenData: "",
    token: async function () {
        if (this.tokenData === "") {
            await this.loadToken();
            return this.tokenData;
        } else {
            return this.tokenData;
        }
    },
    loadToken: function () {
        const gIA = this;
        return new Promise((resolve, reject) => {
            $.ajax({
                url: "http://localhost:3033/token",
                type: "GET",
                xhrFields: {
                    withCredentials: true,
                },
                success: function (data) {
                    if (data.status === 1) {
                        gIA.tokenData = data.token;
                        resolve();
                    } else {
                        reject();
                    }
                },
                error: function () {
                    gIA.tokenData = "";
                    reject();
                },
            });
        });
    },
};
