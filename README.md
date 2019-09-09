# RemoteUi

RemoteUi is a plugin that makes it easier to build complex form editors using .NET and React.

### Server App

Add the following lines of code to your ASP .NET controller or RPC:

```cs
// Define the C# models.
public class Contacts
{
    [RemoteUiField("Phone")] 
    public string Phone { get; set; }
    
    [RemoteUiField("Skype")]
    public string Skype { get; set; }
}

// Define the C# controller response.
public class ContactsResponse
{
    public JObject Definition { get; set; }
    public Contacts Value { get; set; }
}

// Create a new RemoteUi builder.
var noFields = new IExtraRemoteUiField[0];
var builder = new RemoteUiBuilder(typeof(Contacts), noFields)
    // Register all of the custom models 
    // used in your own model tree.
    .Register(typeof(Contacts), noFields);
    
// Return the response from your controller.
var response = new AppSettingsResponse
{
    Definition = builder.Build(null),
    Value = new Contacts
    {
        Phone = "12345",
        Skype = "@skype"
    }
};
return Ok(response);
```

### Client App

Add the following lines to your client React app:

```tsx
import * as React from "react"
import * as ReactDOM from "react-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import { RemoteUiEditor } from "@remoteui/RemoteUiEditor";
import { RemoteUiEditorStore } from "@remoteui/RemoteUiEditorStore";
import { observer } from "mobx-react";
import { observable } from "mobx";

// Define the Typescript models.
interface Contacts {
    phone: string;
    skype: string;
}

// Define the API response.
interface ContactsResponse {
    definition: any;
    value: Contacts;
}

// Fetch the response and populate the store. 
const response: ContactsResponse = fetch(...);
const store = new RemoteUiEditorStore(response.definition, response.value);

// Display the editor form for the data received from the C# server.
const App = observer((props: { }) => {
    return <RemoteUiEditor store={store} />
});

var root = document.createElement("div");
document.body.append(root);
ReactDOM.render(<App />, root);

// To send the save request containing the modified data 
// to the server, extract the form data as follows:
const contacts = await store.getDataAsync();
```
