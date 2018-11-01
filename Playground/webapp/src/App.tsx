import 'bootstrap/dist/css/bootstrap.min.css';
import * as React from "react";
import {RemoteUiEditor} from "@remoteui/RemoteUiEditor";
import {RemoteUiEditorStore} from "@remoteui/RemoteUiEditorStore";
import {observer} from "mobx-react";
import {observable} from "mobx";


class AppStore
{
    @observable editor: RemoteUiEditorStore;
}

const app = new AppStore();


async function init() {
    const desc = await (await fetch('/description')).json(); 
    const initial = await (await fetch('/initial')).json();
    app.editor = new RemoteUiEditorStore(desc, initial);
}

init();
export const App = observer(function()
{
        return <div>
            <a href='#' onClick={async ()=>{
                const data = await app.editor.getDataAsync();
                const json = JSON.stringify(data);
                
                const resp = await fetch('/validate', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: json,
                    
                });
                const errors = await resp.json();
                app.editor!.setErrors(errors);
                
            }}>Save</a>
            {app.editor ? <RemoteUiEditor store={app.editor}/> : null}
        </div>;
});

