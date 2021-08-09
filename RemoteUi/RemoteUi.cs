using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace RemoteUi
{
    public enum RemoteUiFieldType
    {
        String,
        Integer,
        CheckBox,
        Radio,
        Select,
        StringList,
        List,
        Number,
        FileBase64,
        Custom,
        TextArea,
        OrderedMultiSelect
    }

    [AttributeUsage(AttributeTargets.Property)]
    public class RemoteUiField : Attribute
    {
        public string Name { get; set; }
        public string Group { get; set; }
        public object Type { get; set; }
        public object ListType { get; set; }
        public string CustomType { get; set; }
        public bool Nullable { get; set; }
        public string Description { get; set; }
        public bool AlwaysExpanded { get; set; }

        public RemoteUiField(string name, string group, RemoteUiFieldType type)
        {
            Name = name;
            Group = group;
            Type = type;
        }

        public RemoteUiField(string name, string group = "")
        {
            Name = name;
            Group = group;
        }
    }


    [AttributeUsage(AttributeTargets.Property, AllowMultiple = true)]
    public class RemoteUiRadioValue : Attribute
    {
        public string Id { get; set; }
        public string Name { get; set; }

        public RemoteUiRadioValue(object id, string name)
        {
            Id = id?.ToString();
            Name = name;
        }
    }


    [AttributeUsage(AttributeTargets.Property, AllowMultiple = true)]
    public abstract class RemoteUiCustomRadioValuesAttribute : Attribute
    {
        public abstract IEnumerable<KeyValuePair<string, string>> Get(IServiceProvider services);
    }


    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true)]
    public class RemoteUiFieldGroup : Attribute
    {
        public string Id { get; set; }
        public string Name { get; set; }

        public RemoteUiFieldGroup(string id, string name)
        {
            Id = id;
            Name = name;
        }
    }
    
    public class ExtraRemoteUiField<TModel> : IExtraRemoteUiField
    {
        public string Id { get; set; }
        public string DisplayName { get; set; }
        public string Group { get; set; }
        public object Type { get; set; }
        public object ListType { get; set; }
        public List<KeyValuePair<string, string>> PossibleValues { get; set; }
        public Func<TModel, object> Getter { get; set; }
        public Action<TModel, object> Setter { get; set; }

        public Type GetPropertyType() => GetPropertyType(Type, ListType);

        static Type GetPropertyType(object type, object listType)
        {
            if (type is Type t)
                return t;
            switch (type)
            {
                case RemoteUiFieldType.TextArea:
                case RemoteUiFieldType.String:
                case RemoteUiFieldType.Radio:
                case RemoteUiFieldType.Select:
                    return typeof(string);
                case RemoteUiFieldType.StringList:
                case RemoteUiFieldType.OrderedMultiSelect:
                    return typeof(List<string>);
                case RemoteUiFieldType.Integer:
                    return typeof(int);
                case RemoteUiFieldType.CheckBox:
                    return typeof(bool);
                case RemoteUiFieldType.List:
                    return typeof(List<>).MakeGenericType(GetPropertyType(listType, null));
                default:
                    throw new ArgumentException("Invalid Type");
            }
        }

        public object Get(object obj) => Getter((TModel) obj);

        public void Set(object obj, object value) => Setter((TModel) obj, value);
    }

    public interface IExtraRemoteUiField
    {
        object Get(object obj);
        void Set(object obj, object value);
        Type GetPropertyType();
        string Id { get; }
        string Group { get; }
        string DisplayName { get; }
        object Type { get; }
        object ListType { get; }
        List<KeyValuePair<string, string>> PossibleValues { get; }
    }


    class ContractResolver : DefaultContractResolver
    {
        private readonly Dictionary<Type, List<IExtraRemoteUiField>> _extraFields;

        public ContractResolver(Dictionary<Type, List<IExtraRemoteUiField>> extraFields)
        {
            _extraFields = extraFields;
        }

        class FieldValueProvider : IValueProvider
        {
            private readonly IExtraRemoteUiField _field;

            public FieldValueProvider(IExtraRemoteUiField field)
            {
                _field = field;
            }

            public void SetValue(object target, object value) => _field.Set(target, value);

            public object GetValue(object target) => _field.Get(target);
        }

        protected override IList<JsonProperty> CreateProperties(Type type, MemberSerialization memberSerialization)
        {
            var rv = base.CreateProperties(type, memberSerialization);
            if (_extraFields.TryGetValue(type, out var fields))
            {
                foreach (var f in fields)
                {
                    var existing = rv.FirstOrDefault(x => x.PropertyName == f.Id);
                    if (existing != null)
                        rv.Remove(existing);
                    rv.Add(new JsonProperty
                    {
                        PropertyType = f.GetPropertyType(),
                        PropertyName = f.Id,
                        Readable = true,
                        Writable = true,
                        ValueProvider = new FieldValueProvider(f)
                    });
                }
            }

            return rv;
        }
    }

    public class RemoteUiBuilder<T> : RemoteUiBuilder
    {
        public RemoteUiBuilder(IEnumerable<IExtraRemoteUiField> extraFields, Func<string, string> displayTransform = null, NamingStrategy namingStrategy = null) 
            : base(typeof(T), extraFields, displayTransform, namingStrategy)
        {
        }

        public RemoteUiBuilder<T> Register<TType>(IEnumerable<IExtraRemoteUiField> fields, string name = null) =>
            Register(typeof(TType), fields, name);
        
        public new RemoteUiBuilder<T> Register(Type type, IEnumerable<IExtraRemoteUiField> fields, string name = null) =>
            base.Register(type, fields, name) as RemoteUiBuilder<T>;
    }
    
    public class RemoteUiBuilder
    {
        private readonly IEnumerable<IExtraRemoteUiField> _rootExtraFields;
        private readonly Func<string, string> _displayTransform;
        private readonly Type _root;
        private readonly NamingStrategy _namingStrategy;

        class FieldGroup
        {
            [JsonIgnore] public string Id { get; set; } = "";
            [JsonProperty("name")] public string Name { get; set; }
            [JsonProperty("fields")] public List<object> Fields { get; } = new List<object>();
        }

        private readonly Dictionary<Type, string> _registeredTypes = new Dictionary<Type, string>();

        private readonly List<(Type type, IEnumerable<IExtraRemoteUiField> fields)> _types =
            new List<(Type type, IEnumerable<IExtraRemoteUiField> fields)>();

        public RemoteUiBuilder(Type root, 
            IEnumerable<IExtraRemoteUiField> extraFields, Func<string, string> displayTransform = null, NamingStrategy namingStrategy = null)
        {
            _root = root;
            _rootExtraFields = extraFields;
            _displayTransform = displayTransform;
            _namingStrategy = namingStrategy ?? new DefaultNamingStrategy();
        }

        public RemoteUiBuilder Register(Type type, IEnumerable<IExtraRemoteUiField> fields, string name = null)
        {
            _registeredTypes.Add(type, name ?? type.Name);
            _types.Add((type, fields));
            return this;
        }

        public JObject Build(IServiceProvider sp)
        {
            var root = Get(sp, _root, _registeredTypes, _rootExtraFields, _displayTransform);
            root["types"] = JObject.FromObject(_types.ToDictionary(t => _registeredTypes[t.type],
                t => Get(sp, t.type, _registeredTypes, t.fields, _displayTransform)));
            return root;
        }

        public JsonSerializer GetSerializer() => new JsonSerializer
        {
            ContractResolver = GetResolver(),
            Converters = {new StringEnumConverter()}
        };

        ContractResolver GetResolver()
        {
            var dic = _types
                .Where(x => x.fields != null)
                .ToDictionary(t => t.type, t => t.fields?.ToList() ?? new List<IExtraRemoteUiField>());
            dic[_root] = _rootExtraFields?.ToList() ?? new List<IExtraRemoteUiField>();
            return new ContractResolver(dic) {NamingStrategy = _namingStrategy};
        }
        
        public JsonSerializerSettings GetSerializerSettings() => new JsonSerializerSettings()
        {
            ContractResolver = GetResolver(),
            Converters = {new StringEnumConverter()}
        };

        private JObject Get(
            IServiceProvider services, Type typee, 
            Dictionary<Type, string> typeRegistry,
            IEnumerable<IExtraRemoteUiField> extraFields,
            Func<string, string> displayResolver)
        {
            var groups = typee.GetCustomAttributes<RemoteUiFieldGroup>()
                .Select(x => new FieldGroup
                {
                    Id = _namingStrategy.GetPropertyName(x.Id, false),
                    Name = x.Name
                }).ToList();

            var generalGroup = groups.FirstOrDefault(x => x.Id == "");
            if (generalGroup == null)
            {
                groups.Insert(0, generalGroup = new FieldGroup {Name = "", Id = ""});
            }

            var dic = groups.ToDictionary(x => x.Id);

            foreach (var prop in typee.GetProperties())
            {
                var attr = prop.GetCustomAttribute<RemoteUiField>();
                if (attr == null)
                    continue;
                var grp = dic[attr.Group ?? ""];

                object type;
                string listType = null;
                if (attr.Type?.Equals(RemoteUiFieldType.List) == true)
                {
                    listType = (attr.ListType is Type attrListType)
                        ? typeRegistry[attrListType]
                        : attr.ListType?.ToString();
                }

                var nullable = attr.Nullable;
                if (attr.Type is RemoteUiFieldType)
                    type = attr.Type;
                else
                {
                    var ptype = prop.PropertyType;
                    if (ptype == typeof(string))
                        type = RemoteUiFieldType.String;
                    else if (typeof(IEnumerable<string>).IsAssignableFrom(ptype))
                        type = RemoteUiFieldType.StringList;
                    else if (ptype == typeof(int) ||
                             ptype == typeof(long))
                        type = RemoteUiFieldType.Integer;
                    else if (ptype == typeof(int?) ||
                             ptype == typeof(long?))
                    {
                        type = RemoteUiFieldType.Integer;
                        nullable = true;
                    }
                    else if (ptype == typeof(decimal) ||
                             ptype == typeof(float) ||
                             ptype == typeof(double))
                        type = RemoteUiFieldType.Number;
                    else if (ptype == typeof(decimal?) ||
                             ptype == typeof(float?) ||
                             ptype == typeof(double?))
                    {
                        type = RemoteUiFieldType.Number;
                        nullable = true;
                    }
                    else if (ptype == typeof(bool))
                        type = RemoteUiFieldType.CheckBox;
                    else if (typeRegistry.TryGetValue(ptype, out var resolved))
                        type = resolved;
                    else if (ptype.IsConstructedGenericType && ptype.GetGenericTypeDefinition() == typeof(List<>))
                    {
                        type = RemoteUiFieldType.List;
                        if (!typeRegistry.TryGetValue(ptype.GetGenericArguments()[0], out listType))
                            throw new InvalidProgramException(
                                "Subtype is not registered: " + ptype.GetGenericArguments()[0]);
                    }
                    else
                        throw new InvalidProgramException("Unknown remote field type");
                }

                var name = attr.Name;
                var description = attr.Description;
                if (displayResolver != null)
                {
                    if (description != null) 
                        description = displayResolver(description);
                    if (name != null)
                        name = displayResolver(name);
                }

                var field = new JObject
                {
                    ["name"] = name,
                    ["id"] = _namingStrategy.GetPropertyName(prop.Name, false),
                    ["type"] = type.ToString(),
                    ["description"] = description,
                    ["alwaysExpanded"] = attr?.AlwaysExpanded == true
                };
                if (attr?.CustomType != null)
                    field["customType"] = attr.CustomType; 
                if (nullable)
                    field["nullable"] = true;
                if (listType != null)
                    field["listType"] = listType;
                if (type.Equals(RemoteUiFieldType.Radio)              ||
                    type.Equals(RemoteUiFieldType.Select)             ||
                    type.Equals(RemoteUiFieldType.OrderedMultiSelect) ||
                    type.Equals(RemoteUiFieldType.Custom))
                {
                    var lst = new List<object>();

                    foreach (var radioAttr in prop.GetCustomAttributes<RemoteUiRadioValue>())
                    {
                        lst.Add(new
                        {
                            id = _namingStrategy.GetPropertyName(radioAttr.Id, false),
                            name = radioAttr.Name
                        });
                    }

                    foreach (var customAttr in prop.GetCustomAttributes<RemoteUiCustomRadioValuesAttribute>(true))
                    {
                        foreach (var kp in customAttr.Get(services))
                            lst.Add(new
                            {
                                id = _namingStrategy.GetPropertyName(kp.Key, false),
                                name = kp.Value
                            });
                    }

                    field["possibleValues"] = JToken.FromObject(lst);
                }

                grp.Fields.Add(field);
            }

            if (extraFields != null)
                foreach (var extra in extraFields)
                {
                    var grp = dic[extra.Group ?? ""];
                    var field = new JObject
                    {
                        ["id"] = _namingStrategy.GetPropertyName(extra.Id, false),
                        ["name"] = extra.DisplayName,
                        ["type"] = extra.Type.ToString()
                    };
                    if (extra.Type.Equals(RemoteUiFieldType.Radio)              ||
                        extra.Type.Equals(RemoteUiFieldType.Select)             ||
                        extra.Type.Equals(RemoteUiFieldType.OrderedMultiSelect) ||
                        extra.Type.Equals(RemoteUiFieldType.Custom))
                        field["possibleValues"] = JToken.FromObject(extra.PossibleValues.Select(kp => new
                        {
                            id = _namingStrategy.GetPropertyName(kp.Key, false),
                            name = kp.Value
                        }));
                    if (extra.Type.Equals(RemoteUiFieldType.List))
                        field["listType"] = (extra.ListType is Type listType)
                            ? typeRegistry[listType]
                            : extra.ListType?.ToString();
                    grp.Fields.Add(field);
                }


            return new JObject
            {
                ["groups"] = JToken.FromObject(groups)
            };
        }

    }
}
