# RemoteUi

RemoteUi is a plugin that makes it easier to build complex form editors using .NET and React.

## Getting Started

Add the following lines of code to your ASP .NET controller or RPC:

```cs
// Define the C# models.
public class Contacts
{
    [RemoteUiField("Phone", Descripton = "Your phone number.")] 
    public string Phone { get; set; }
    
    [RemoteUiField("Skype", Description = "Your Skype username.")]
    public string Skype { get; set; }
}

// Define the C# DTO used for generating remote UI.
public class ContactsResponse
{
    // This property denotes the definition used to build a RemoteUi
    // editor, the definition is generated using RemoteUiBuilder<T>.
    public JObject Definition { get; set; }

    // This property denotes the model that is used to populate
    // RemoteUi editor fields. In other words, this model contains
    // default property values for the RemoteUi editor.
    public Contacts Value { get; set; }
}

// Create a new RemoteUi builder. Register all of your custom nested
// models here, that are used in your model tree.
var builder = new RemoteUiBuilder<Contacts>()
    // .Register<ContactsInnerModel>() etc.
    .Register<Contacts>();
    
// Return the response from your controller or RPC.
return Ok(new ContactsResponse
{
    Definition = builder.Build((IServiceProvider)null),
    Value = new Contacts
    {
        Phone = "12345",
        Skype = "@skype"
    }
});
```

Add the following lines to your client React app:

```tsx
import * as React from "react"
import * as ReactDOM from "react-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import { RemoteUiEditor } from "@remoteui/RemoteUiEditor";
import { RemoteUiEditorStore, RemoteUiDefinition } from "@remoteui/RemoteUiEditorStore";
import { observer } from "mobx-react";
import { observable } from "mobx";

// Define the Typescript models.
interface Contacts {
    phone: string;
    skype: string;
}

// Define the API response.
interface ContactsResponse {
    definition: RemoteUiDefinition;
    value: Contacts;
}

// Fetch the response and populate the store. 
const response: ContactsResponse = await fetch(...);
const store = new RemoteUiEditorStore(response.definition, response.value);

// Display the editor form for the data received from the C# server.
const App = observer((props: { }) => {
    return <RemoteUiEditor store={store} />
});

const root = document.createElement("div");
document.body.append(root);
ReactDOM.render(<App />, root);

// To validate and send the save request containing the modified
// Contacts model to the server, extract the form data as follows:
const contacts = await store.getDataAsync();
```

## Features

### RemoteUi Field Types

RemoteUi allows configuring properties of fields in an editor, such as title, description, nullability, group or field type. Supported field types are: `String`, `Integer`, `CheckBox`, `Radio`, `Select`, `StringList`, `List`, `Number`, `FileBase64`, `Custom`, `TextArea`, `OrderedMultiSelect`. RemoteUi is able to infer most types based on C# primitive types from standard library, so in most cases you don't have to specify the type explicitly.

```cs
public class SampleRemoteUiDto
{
    [RemoteUiField(
        "Property title",
        Type = RemoteUiFieldType.String,
        Description = "Property description, can contain long messages.",
        Nullable = false)]
    public string TextField { get; set; } = string.Empty;

    [RemoteUiField("CheckBox")] // RemoteUiFieldType.CheckBox
    public bool BooleanField { get; set; }

    [RemoteUiField("Integer")] // RemoteUiFieldType.Integer
    public int IntegerField { get; set; }

    [RemoteUiField("Number")] // RemoteUiFieldType.Number
    public double DoubleField { get; set; }
}
```

For a `Select` field, you can provide possible options via `RemoteUiRadioValue` attributes:

```cs
public class SampleRemoteUiDto
{
    [RemoteUiRadioValue("id-1", "First possible value")]
    [RemoteUiRadioValue("id-2", "Second possible value")]
    [RemoteUiField("Property title", Type = RemoteUiFieldType.Select)]
    public string Option { get; set; } = "id-1";
}
```

Additionally, RemoteUi allows loading possible `Select` options dynamically:

```cs
public class SampleRemoteUiDto
{
    [SelectOptionProvider]
    [RemoteUiField("One option from a given set", Type = RemoteUiFieldType.Select)]
    public string Option { get; set; } = "anon";

    public class SelectOptionProvider : RemoteUiCustomRadioValuesAttribute
    {
        // The IServiceProvider parameter denotes an instance of the service provider you pass
        // into the RemoteUiBuilder<T>.Build method when configuring RemoteUi.
        public override IEnumerable<KeyValuePair<string, string>> Get(IServiceProvider services)
        {
            return new Dictionary<string, string>
            {
                {"id-1", "First possble value"},
                {"id-2", "Second possble value"},
            };
        }
    }
}
```

There is also a useful `OrderedMultiSelect` field type that allows selecting multiple values obtained from a provider that inherits from `RemoteUiCustomRadioValues`. The values selected via `OrderedMultiSelect` are kept in a deterministic order defined by a user. See an example:

```cs
public class SampleRemoteUiDto
{
    [SelectOptionProvider]
    [RemoteUiField("Multiple options from a given set", Type = RemoteUiFieldType.OrderedMultiSelect)]
    public List<string> Options { get; set; } = new List<string>();

    public class SelectOptionProvider : RemoteUiCustomRadioValuesAttribute
    {
        // The IServiceProvider parameter denotes an instance of the service provider you pass
        // into the RemoteUiBuilder<T>.Build method when configuring RemoteUi.
        public override IEnumerable<KeyValuePair<string, string>> Get(IServiceProvider services)
        {
            return new Dictionary<string, string>
            {
                {"id-1", "First possble value"},
                {"id-2", "Second possble value"},
            };
        }
    }
}
```

The example above results into the following UI:

![image](https://user-images.githubusercontent.com/6759207/74869540-33907c80-5369-11ea-87e9-ea546f0c9f43.png)

### RemoteUi Builder Configuration

In case if you'd like to support multiple languages in your application, you can pass dictionary keys to `Title` and `Description` attribute properties when defining a `RemoteUiField`. Then, pass a `displayTransform` parameter of type `Func<string, string>` to the `RemoteUiBuilder` constructor:

```cs
var builder = new RemoteUiBuilder<Contacts>(
        displayTransform: key => language[key])
    .Register<Contacts>();
```

If you are using a custom naming strategy in your C# APIs, you can override the naming strategy used during RemoteUi definition generation. Just pass a `namingStrategy` parameter to the `RemoteUiBuilder` constructor:

```cs
var builder = new RemoteUiBuilder<Contacts>(
        namingStrategy: new CamelCaseNamingStrategy())
    .Register<Contacts>();
```