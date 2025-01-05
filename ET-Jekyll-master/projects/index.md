<html lang="en" dir="ltr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>{{ page.title }} | {{ site.title }}</title>
    <meta name="description" content="{% if page.description %}{{ page.description }}{% else %}{{ site.description }}{% endif %}">
    <link rel="shortcut icon" href="{{ site.baseurl }}/favicon.ico" type="image/x-icon">
    <link rel="icon" href="{{ site.baseurl }}/favicon.ico" type="image/x-icon">
    <link href='{{ site.baseurl }}/feed.xml' rel='alternate' type='application/atom+xml'>
    <link rel="canonical" href="{{ site.baseurl }}{{ page.url }}">
    <link rel="stylesheet" href="{{ site.baseurl }}/style.css">
</head>

<body>
    <main>
        {% assign sorted_projects = site.projects | sort: "start_date" | reverse %}
        {% for project in sorted_projects %}
            <div class="project">
                <h4>
                    <strong>
                        <a href="{{ project.link }}" target="_blank" rel="noopener noreferrer">{{ project.title }}</a>
                    </strong>
                </h4>
                <p><strong></strong> {{ project.start_date | date: "%m-%d-%Y" }} -- {{ project.end_date | date: "%m-%d-%Y" }}</p>
                <p><strong>Technologies:</strong> {{ project.technologies | join: ", " }}</p>
                <ul>
                    {{ project.content | markdownify }}
                </ul>
            </div>
        {% endfor %}
    </main>
</body>

</html>